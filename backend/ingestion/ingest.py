import os
import glob
import pickle
import uuid
import time
from pathlib import Path
from tqdm import tqdm # pip install tqdm

# LangChain Imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.storage import LocalFileStore, EncoderBackedStore
from langchain.retrievers import ParentDocumentRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

# --- CONFIGURATION ---
DATA_FOLDER = "data"
DB_PATH = "./chroma_db"
DOC_STORE_PATH = "./doc_store"
BM25_PATH = "./bm25_index.pkl"

# The Cross-Lingual Model
EMBEDDING_MODEL_NAME = "AkshitaS/bhasha-embed-v0"

def get_law_metadata(filename):
    fname = filename.lower()
    meta = {}
    
    # 1. Law Type
    if "vs" in fname or "compare" in fname:
        meta["law_type"] = "Comparison"
    elif "ipc" in fname:
        meta["law_type"] = "IPC"
    elif "bns" in fname:
        meta["law_type"] = "BNS"
    else:
        meta["law_type"] = "General_Law"

    # 2. Language
    meta["language"] = "hi" if "hindi" in fname or "hi" in fname else "en"
    
    return meta

def setup_components():
    """
    Initializes and returns all the core components (Embeddings, Stores, Splitters).
    """
    print(f"🔌 Loading Embeddings: {EMBEDDING_MODEL_NAME}...")
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={'device': 'cpu'}, 
            encode_kwargs={'normalize_embeddings': True}
        )
    except Exception as e:
        print(f"⚠️ Error loading primary model: {e}")
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Storage: Vector (Child)
    vectorstore = Chroma(
        collection_name="legal_corpus",
        embedding_function=embeddings,
        persist_directory=DB_PATH
    )

    # Storage: Doc (Parent) - with Encoder for safety
    fs = LocalFileStore(DOC_STORE_PATH)
    
    # --- FIX IS HERE ---
    store = EncoderBackedStore(
        store=fs,
        key_encoder=lambda x: x,
        value_serializer=lambda x: pickle.dumps(x),      # Renamed from 'encoder'
        value_deserializer=lambda x: pickle.loads(x),    # Renamed from 'decoder'
    )

    # Splitters
    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)

    # The Retriever
    retriever = ParentDocumentRetriever(
        vectorstore=vectorstore,
        docstore=store,
        child_splitter=child_splitter,
        parent_splitter=parent_splitter,
    )

    return retriever, parent_splitter

def main():
    print("🚀 Starting ROBUST Local Ingestion...")
    
    # 1. Setup Components
    retriever, parent_splitter = setup_components()
    
    # 2. Scan Files
    pdf_files = glob.glob(os.path.join(DATA_FOLDER, "*.pdf"))
    if not pdf_files:
        print(f"❌ No PDFs found in {DATA_FOLDER}")
        return
    
    print(f"📂 Found {len(pdf_files)} documents to process.")

    # 3. Processing Loop (File by File to save RAM)
    all_docs_for_bm25 = [] 

    for file_path in tqdm(pdf_files, desc="Processing PDFs"):
        filename = os.path.basename(file_path)
        meta = get_law_metadata(filename)
        
        try:
            # A. Load Single PDF
            loader = PyPDFLoader(file_path)
            raw_docs = loader.load()
            
            # B. Enrich Metadata
            for doc in raw_docs:
                doc.metadata["source_file"] = filename
                doc.metadata["law_type"] = meta["law_type"]
                doc.metadata["language"] = meta["language"]
                doc.metadata["doc_id"] = str(uuid.uuid4())

            # C. Ingest into Parent-Child Retriever (Chroma + LocalStore)
            if raw_docs:
                retriever.add_documents(raw_docs)
                all_docs_for_bm25.extend(raw_docs)

        except Exception as e:
            print(f"\n❌ Error processing {filename}: {e}")
            continue

    print("\n✅ Semantic Indexing Complete.")

    # 4. Build Keyword Index (BM25)
    print("⚙️  Building BM25 Keyword Index (This covers all documents)...")
    try:
        bm25_docs = parent_splitter.split_documents(all_docs_for_bm25)
        bm25_retriever = BM25Retriever.from_documents(bm25_docs)
        
        with open(BM25_PATH, "wb") as f:
            pickle.dump(bm25_retriever, f)
        print(f"✅ BM25 Index Saved to {BM25_PATH}")
        
    except Exception as e:
        print(f"⚠️ BM25 Generation failed: {e}")

    print("\n🎉 INGESTION FINISHED.")
    print(f"   Vectors: {DB_PATH}")
    print(f"   Docs:    {DOC_STORE_PATH}")

if __name__ == "__main__":
    main()