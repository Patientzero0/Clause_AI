import os
import pickle
import time
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.storage import LocalFileStore, EncoderBackedStore
from langchain.retrievers import ParentDocumentRetriever, EnsembleRetriever
# FIXED: Added this import
from langchain_text_splitters import RecursiveCharacterTextSplitter

# --- CONFIGURATION ---
DB_PATH = "./chroma_db"
DOC_STORE_PATH = "./doc_store"
BM25_PATH = "./bm25_index.pkl"
EMBEDDING_MODEL = "AkshitaS/bhasha-embed-v0"

def load_system():
    print("⏳ Loading System... ", end="", flush=True)
    
    # 1. Embeddings
    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={'device': 'cpu'}, 
            encode_kwargs={'normalize_embeddings': True}
        )
    except:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # 2. Vector Store (Child)
    vectorstore = Chroma(
        collection_name="legal_corpus",
        embedding_function=embeddings,
        persist_directory=DB_PATH
    )

    # 3. Doc Store (Parent)
    fs = LocalFileStore(DOC_STORE_PATH)
    store = EncoderBackedStore(
        store=fs,
        key_encoder=lambda x: x,
        value_serializer=lambda x: pickle.dumps(x),
        value_deserializer=lambda x: pickle.loads(x),
    )

    # FIXED: Define dummy splitters to satisfy Pydantic validation
    # (These won't be used for retrieval, but the class requires them)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=400)
    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)

    # 4. Semantic Retriever
    semantic_retriever = ParentDocumentRetriever(
        vectorstore=vectorstore,
        docstore=store,
        child_splitter=child_splitter,  # FIXED: Passed actual object
        parent_splitter=parent_splitter, # FIXED: Passed actual object
    )

    # 5. Keyword Retriever (BM25)
    if os.path.exists(BM25_PATH):
        with open(BM25_PATH, "rb") as f:
            bm25_retriever = pickle.load(f)
            bm25_retriever.k = 3
    else:
        print("\n⚠️  BM25 Index missing!")
        bm25_retriever = None

    # 6. Ensemble
    if bm25_retriever:
        retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, semantic_retriever],
            weights=[0.4, 0.6]
        )
    else:
        retriever = semantic_retriever
        
    print("✅ Done!")
    return retriever

def run_test(retriever, query, description):
    print(f"\n{'='*60}")
    print(f"🧪 TEST: {description}")
    print(f"🔎 Query: '{query}'")
    print(f"{'-'*60}")
    
    start = time.time()
    try:
        docs = retriever.invoke(query)
    except Exception as e:
        print(f"❌ Error during retrieval: {e}")
        return

    duration = time.time() - start
    
    if not docs:
        print("❌ No results found.")
        return

    print(f"✅ Found {len(docs)} docs in {duration:.2f}s:\n")
    
    for i, doc in enumerate(docs[:3]): # Show top 3
        source = doc.metadata.get('source_file', 'Unknown')
        law_type = doc.metadata.get('law_type', 'N/A')
        # Clean up newlines for cleaner CLI output
        preview = doc.page_content[:200].replace('\n', ' ') + "..."
        
        print(f"   {i+1}. [{law_type}] {source}")
        print(f"      \"{preview}\"\n")

def main():
    if not os.path.exists(DB_PATH):
        print("❌ Error: 'chroma_db' not found. Run ingest.py first.")
        return

    retriever = load_system()

    # --- THE 3 TESTS ---
    
    # 1. Cross-Lingual Concept
    run_test(retriever, 
             "chori ki saza kya hai", 
             "Hindi Query (Testing Bhasha-Embed)")

    # 2. Exact Keyword
    run_test(retriever, 
             "Section 302 punishment", 
             "Keyword Lookup (Testing BM25)")

    # 3. Comparison
    run_test(retriever, 
             "difference between ipc and bns for cheating", 
             "Comparison (Testing Metadata Routing)")

if __name__ == "__main__":
    main()