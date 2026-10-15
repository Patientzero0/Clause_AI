import os
import glob
import pickle
import uuid
import time
from pathlib import Path
from tqdm import tqdm

# LangChain Imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.storage import LocalFileStore, EncoderBackedStore
from langchain.retrievers import ParentDocumentRetriever
from langchain_community.retrievers import BM25Retriever

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
    if "vs" in fname or "compare" in fname:
        meta["law_type"] = "Comparison"
    elif "ipc" in fname:
        meta["law_type"] = "IPC"
    elif "bns" in fname:
        meta["law_type"] = "BNS"
    else:
        meta["law_type"] = "General_Law"
    meta["language"] = "hi" if "hindi" in fname or "hi" in fname else "en"
    return meta

def get_existing_files(vectorstore):
    """
    Queries ChromaDB to find out which files are already ingested.
    Returns a SET of filenames (e.g., {'IPC.pdf', 'BNS.pdf'}).
    """
    print("🔍 Checking database for existing files...")
    try:
        # Get metadata for ALL documents
        # Note: For <100k chunks, this is fast. For millions, we'd need a different strategy.
        result = vectorstore.get(include=["metadatas"])
        existing_files = set()
        for meta in result['metadatas']:
            if 'source_file' in meta:
                existing_files.add(meta['source_file'])
        return existing_files
    except Exception as e:
        print(f"⚠️ Could not read existing DB: {e}")
        return set()

def setup_components():
    print(f"🔌 Loading Embeddings: {EMBEDDING_MODEL_NAME}...")
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL_NAME,
            model_kwargs={'device': 'cpu'}, 
            encode_kwargs={'normalize_embeddings': True}
        )
    except Exception:
        print(f"⚠️ Error loading primary model: {e}")

    vectorstore = Chroma(
        collection_name="legal_corpus",
        embedding_function=embeddings,
        persist_directory=DB_PATH
    )

    fs = LocalFileStore(DOC_STORE_PATH)
    store = EncoderBackedStore(
        store=fs,
        key_encoder=lambda x: x,
        value_serializer=lambda x: pickle.dumps(x),
        value_deserializer=lambda x: pickle.loads(x),
    )

    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)

    retriever = ParentDocumentRetriever(
        vectorstore=vectorstore,
        docstore=store,
        child_splitter=child_splitter,
        parent_splitter=parent_splitter,
    )

    return retriever, parent_splitter, vectorstore

# --- BATCH HELPER (Fixes the 5461 crash) ---
def process_batches(retriever, docs, batch_size=50): # Reduced to 50 for safety
    total = len(docs)
    for i in range(0, total, batch_size):
        batch = docs[i : i + batch_size]
        try:
            retriever.add_documents(batch)
        except Exception as e:
            print(f"   ⚠️ Error in sub-batch {i}: {e}")

def main():
    print("🚀 Starting SMART RESUME Ingestion...")
    
    retriever, parent_splitter, vectorstore = setup_components()
    
    # 1. See what is already done
    processed_files = get_existing_files(vectorstore)
    print(f"📂 Database contains {len(processed_files)} files: {list(processed_files)}")
    
    # 2. Scan Folder
    pdf_files = glob.glob(os.path.join(DATA_FOLDER, "*.pdf"))
    
    # 3. Filter List (Only process what is NOT in DB)
    files_to_process = []
    for f in pdf_files:
        fname = os.path.basename(f)
        if fname not in processed_files:
            files_to_process.append(f)
        else:
            print(f"   ⏩ Skipping {fname} (Already in DB)")
            
    if not files_to_process:
        print("✅ All files are already ingested! Nothing to do.")
        return

    print(f"Files to process: {[os.path.basename(f) for f in files_to_process]}")
    
    # 4. Process ONLY the missing files
    all_docs_for_bm25 = [] # We'll just build BM25 for new stuff for now

    for file_path in tqdm(files_to_process, desc="Ingesting Missing Files"):
        filename = os.path.basename(file_path)
        meta = get_law_metadata(filename)
        
        try:
            loader = PyPDFLoader(file_path)
            raw_docs = loader.load()
            
            for doc in raw_docs:
                doc.metadata["source_file"] = filename
                doc.metadata["law_type"] = meta["law_type"]
                doc.metadata["language"] = meta["language"]
                doc.metadata["doc_id"] = str(uuid.uuid4())

            # USE BATCH PROCESSOR
            if raw_docs:
                print(f"   Processing {len(raw_docs)} pages for {filename}...")
                process_batches(retriever, raw_docs, batch_size=50)
                all_docs_for_bm25.extend(raw_docs)

        except Exception as e:
            print(f"\n❌ Error processing {filename}: {e}")
            continue

    print("\n✅ Smart Ingestion Complete.")

    # 5. Handle BM25
    # Note: To have a perfect BM25, you technically need ALL docs. 
    # But for now, we just save the index for the new files so you don't lose search capability.
    if all_docs_for_bm25:
        print("⚙️  Updating BM25 Index...")
        try:
            bm25_docs = parent_splitter.split_documents(all_docs_for_bm25)
            bm25_retriever = BM25Retriever.from_documents(bm25_docs)
            
            with open(BM25_PATH, "wb") as f:
                pickle.dump(bm25_retriever, f)
            print(f"✅ BM25 Index Saved to {BM25_PATH}")
        except Exception as e:
            print(f"⚠️ BM25 Generation failed: {e}")

if __name__ == "__main__":
    main()