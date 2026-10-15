import os
import glob
import pickle
import time
from tqdm import tqdm

# LangChain & Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.retrievers import BM25Retriever

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# Data structure: backend/supreme_court/2000/*.pdf
SEARCH_PATTERN = os.path.join(CURRENT_DIR, "**", "*.pdf")

DB_PATH = os.path.join(CURRENT_DIR, "chroma_db")
BM25_PATH = os.path.join(CURRENT_DIR, "bm25.pkl")
CHECKPOINT_FILE = os.path.join(CURRENT_DIR, "checkpoint.txt")

EMBEDDING_MODEL = "AkshitaS/bhasha-embed-v0"

# BATCH SIZE: Number of PDF files to process before saving to DB
# Lower this if you still get memory errors (e.g., set to 5 or 10)
FILE_BATCH_SIZE = 10 

def load_checkpoint():
    """Reads the list of successfully processed files."""
    if not os.path.exists(CHECKPOINT_FILE):
        return set()
    with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f)

def update_checkpoint(filenames):
    """Appends processed filenames to the log."""
    with open(CHECKPOINT_FILE, "a", encoding="utf-8") as f:
        for name in filenames:
            f.write(name + "\n")

def main():
    print(f"🚀 Starting Checkpointed Ingestion for: {CURRENT_DIR}")

    # 1. Initialize Embeddings (Loaded once)
    print(f"🔌 Loading Embeddings ({EMBEDDING_MODEL})...")
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
    )

    # 2. Initialize Vector Store (Persistent)
    print(f"💾 Connecting to ChromaDB at {DB_PATH}...")
    vectorstore = Chroma(
        collection_name="sc_judgments",
        embedding_function=embeddings,
        persist_directory=DB_PATH
    )

    # 3. Find Files
    print("🔍 Scanning for PDFs (Recursive)...")
    all_files = glob.glob(SEARCH_PATTERN, recursive=True)
    
    if not all_files:
        print(f"❌ No PDFs found! Check your folders inside {CURRENT_DIR}")
        return

    # 4. Filter Already Processed Files
    processed_files = load_checkpoint()
    files_to_process = [f for f in all_files if f not in processed_files]
    
    print(f"📂 Total Files: {len(all_files)}")
    print(f"✅ Already Done: {len(processed_files)}")
    print(f"⏩ Remaining:   {len(files_to_process)}")

    if not files_to_process:
        print("🎉 All files are already ingested!")
        return

    # 5. Define Splitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)

    # 6. Batch Processing Loop
    current_doc_batch = []      # Accumulates chunks
    current_file_batch = []     # Accumulates filenames for checkpoint
    
    # Just for BM25 (Warning: This accumulates in RAM. If you have 100GB of text, this part might need disabling)
    all_chunks_for_bm25 = [] 

    print(f"\n⚙️  Processing in batches of {FILE_BATCH_SIZE} files...")
    
    for file_path in tqdm(files_to_process, desc="Ingesting"):
        try:
            # A. Load PDF
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            
            # B. Extract Metadata
            parent_dir = os.path.basename(os.path.dirname(file_path)) # "2003"
            filename = os.path.basename(file_path) # "Judgment.pdf"

            for d in docs:
                d.metadata["source"] = filename
                d.metadata["type"] = "judgment"
                if parent_dir.isdigit() and len(parent_dir) == 4:
                    d.metadata["year"] = int(parent_dir)
                else:
                    d.metadata["year"] = "Unknown"

            # C. Split (Chunking)
            chunks = text_splitter.split_documents(docs)
            
            # Add to current batch
            current_doc_batch.extend(chunks)
            current_file_batch.append(file_path)
            
            # Keep for BM25 (Optional - comment out if RAM issues)
            all_chunks_for_bm25.extend(chunks)

            # D. CHECKPOINT TRIGGER
            if len(current_file_batch) >= FILE_BATCH_SIZE:
                # 1. Write to DB
                vectorstore.add_documents(current_doc_batch)
                
                # 2. Update Checkpoint Log
                update_checkpoint(current_file_batch)
                
                # 3. Clear Lists
                current_doc_batch = []
                current_file_batch = []

        except Exception as e:
            # Log error but keep going
            tqdm.write(f"⚠️ Error on {os.path.basename(file_path)}: {e}")
            # If a file fails, we DON'T add it to checkpoint so you can retry fixing it later
            continue

    # 7. Flush Final Batch (if any left)
    if current_doc_batch:
        print("💾 Saving final batch...")
        vectorstore.add_documents(current_doc_batch)
        update_checkpoint(current_file_batch)

    print("\n✅ Semantic Ingestion Complete.")

    # 8. Build BM25 Index (Optional but recommended)
    # Note: If your dataset is MASSIVE, building BM25 in one shot might OOM.
    if all_chunks_for_bm25:
        print("⚙️  Building BM25 Keyword Index (This might take a moment)...")
        try:
            bm25_retriever = BM25Retriever.from_documents(all_chunks_for_bm25)
            with open(BM25_PATH, "wb") as f:
                pickle.dump(bm25_retriever, f)
            print(f"✅ BM25 Index Saved to {BM25_PATH}")
        except Exception as e:
            print(f"⚠️ BM25 Build Failed (RAM likely full): {e}")
            print("   (Your vector search still works fine!)")
    
    print("\n🎉 ALL DONE!")

if __name__ == "__main__":
    main()