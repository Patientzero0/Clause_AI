import os
import pickle
from tqdm import tqdm
from langchain.storage import LocalFileStore, EncoderBackedStore
from langchain_community.retrievers import BM25Retriever
from langchain_text_splitters import RecursiveCharacterTextSplitter

# --- PATHS ---
DOC_STORE_PATH = "./doc_store"
BM25_PATH = "./bm25_index.pkl"

def rebuild_index():
    print(f"⚙️  Rebuilding Master BM25 Index from {DOC_STORE_PATH}...")
    
    # 1. Access the saved docs on disk
    if not os.path.exists(DOC_STORE_PATH):
        print("❌ Error: Doc Store not found!")
        return

    # 2. Iterate through every file in ./doc_store and unpickle it
    # This retrieves every document (BNS, IPC, Hindi) you have ever ingested.
    all_docs = []
    files = os.listdir(DOC_STORE_PATH)
    
    print(f"📂 Found {len(files)} saved document chunks. Loading...")
    
    for filename in tqdm(files):
        file_path = os.path.join(DOC_STORE_PATH, filename)
        try:
            with open(file_path, "rb") as f:
                # The LocalFileStore saves raw bytes. 
                # Since we used pickle in ingest, we unpickle here.
                doc = pickle.load(f)
                all_docs.append(doc)
        except Exception as e:
            # Skip corrupted files if any
            pass

    if not all_docs:
        print("❌ No documents found to index.")
        return

    print(f"✅ Loaded {len(all_docs)} parent documents.")

    # 3. Regenerate BM25 (The keyword engine)
    print("🧠 Training BM25 on the full corpus...")
    
    # We use the parent chunks directly
    bm25_retriever = BM25Retriever.from_documents(all_docs)
    
    # 4. Overwrite the incomplete index with this Master Index
    with open(BM25_PATH, "wb") as f:
        pickle.dump(bm25_retriever, f)
        
    print(f"✅ Master BM25 Index Saved to {BM25_PATH}")
    print("🎉 System is now fully synced!")

if __name__ == "__main__":
    rebuild_index()