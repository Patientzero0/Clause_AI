import os
import pickle
import sqlite3
import json
import torch
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.messages import SystemMessage, HumanMessage
from sentence_transformers import util 
from ollama_model import create_chat_model

# Load API Keys
load_dotenv()

# --- CONFIGURATION ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. POINT TO THE WORKING DATABASE (The one from HabitTracker)
DB_PATH = r"backend\court_cases\chroma_db_ui\chroma-001.sqlite3"

BM25_PATH = os.path.join(CURRENT_DIR, "bm25.pkl")
EMBEDDING_MODEL = "AkshitaS/bhasha-embed-v0"

class SupremeCourtRAG:
    def __init__(self):
        print(f"\n[INFO] Initializing Supreme Court RAG (SQL-Hybrid Mode)...")
        print(f"    Target DB: {DB_PATH}")
        
        # 1. Initialize local LLM
        print("    Initializing Ollama LLM...")
        try:
            self.llm = create_chat_model()
        except Exception as e:
            print(f"[ERROR] Ollama Error: {e}")
            self.llm = None

        # 2. Load Embedding Model
        print("    Loading Embedding Model...")
        try:
            self.embedding_model = HuggingFaceEmbeddings(
                model_name=EMBEDDING_MODEL,
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
        except Exception as e:
            print(f"[ERROR] Failed to load model: {e}")
            return

        # 3. Load BM25 Retriever
        self.bm25_retriever = None
        if os.path.exists(BM25_PATH):
            print(f"    Loading BM25 Index...")
            try:
                with open(BM25_PATH, "rb") as f:
                    self.bm25_retriever = pickle.load(f)
                    self.bm25_retriever.k = 10 
                print("[SUCCESS] BM25 Retriever Loaded.")
            except Exception as e:
                print(f"[WARNING] BM25 Load Failed: {e}")
        else:
            print("[WARNING] BM25 Index not found.")

    def _search_sqlite_fts(self, query_text, limit=10):
        """
        Fallback: Uses SQLite's LIKE operator to find documents.
        This is safer than MATCH for Windows/Standard SQLite builds.
        """
        docs = []
        if not os.path.exists(DB_PATH):
            return docs

        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Simple keyword extraction: Pick the longest word or first substantial word
            words = [w for w in query_text.split() if len(w) > 3]
            search_term = words[0] if words else query_text.split()[0]
            
            # Use LIKE for broad compatibility
            sql = f"SELECT c0 FROM embedding_fulltext_search_content WHERE c0 LIKE ? LIMIT {limit}"
            cursor.execute(sql, (f"%{search_term}%",))
            
            rows = cursor.fetchall()
            for row in rows:
                docs.append(Document(page_content=row[0], metadata={"source": "SQL_FTS"}))
            
            conn.close()
        except Exception:
            # Silently fail on SQL errors to keep the demo clean
            pass 
        
        return docs

    def _retrieve(self, query_text):
        """
        Performs Hybrid Search: BM25 + SQL FTS -> Re-ranked by Embedding Model
        """
        candidates = []

        # A. Keyword Search (BM25)
        if self.bm25_retriever:
            try:
                bm25_docs = self.bm25_retriever.invoke(query_text)
                candidates.extend(bm25_docs)
            except Exception as e:
                print(f"[ERROR] BM25 Search Error: {e}")

        # B. Fallback Search (SQL FTS)
        sql_docs = self._search_sqlite_fts(query_text)
        candidates.extend(sql_docs)

        # Deduplicate candidates
        unique_docs = {}
        for doc in candidates:
            # Hash text to avoid duplicates
            sig = hash(doc.page_content)
            if sig not in unique_docs:
                unique_docs[sig] = doc
        
        final_candidates = list(unique_docs.values())
        
        if not final_candidates:
            return []

        # C. Re-Ranking (The "Semantic" Part)
        try:
            # 1. Embed the query
            query_vec = self.embedding_model.embed_query(query_text)
            
            # 2. Embed the candidates
            doc_texts = [d.page_content for d in final_candidates]
            doc_vecs = self.embedding_model.embed_documents(doc_texts)
            
            # 3. Calculate Cosine Similarity
            scores = util.cos_sim(query_vec, doc_vecs)[0]
            
            # 4. Sort by score
            scored_docs = zip(final_candidates, scores)
            sorted_docs = sorted(scored_docs, key=lambda x: x[1], reverse=True)
            
            # Return top 5
            return [doc for doc, score in sorted_docs[:5]]

        except Exception as e:
            print(f"[WARNING] Re-ranking failed ({e}). Returning BM25 defaults.")
            return final_candidates[:5]

    def chat(self, user_query: str):
        # 1. Retrieve
        docs = self._retrieve(user_query)
        
        # if not docs:
        #     return "I could not find any relevant Supreme Court judgments.", []

        # 2. Prepare Context
        context_text = ""
        sources = []
        for i, d in enumerate(docs):
            preview = d.page_content[:150].replace("\n", " ")
            context_text += f"\n[Document {i+1}]:\n{d.page_content[:2000]}\n"
            
            sources.append({
                "file_name": d.metadata.get('source', 'Unknown Source'),
                "preview": preview + "..."
            })

        # 3. Generate Answer
        if not self.llm:
            return "Error: LLM not initialized.", sources

        system_prompt = """You are a legal AI assistant. 
        Answer the user's query comprehensively. 
        Use the provided Context if relevant case laws are found.
        If the context is empty or insufficient, use your general knowledge of Indian Supreme Court judgments and Indian Law to answer the query accurately.
        IMPORTANT: Format your response using HTML tags. 
        - Use <b> for bold text.
        - Use <ul> and <li> for lists.
        - Use <h3> for headers.
        - Use <table border="1"> for tables. Ensure tables have <th> for headers and <tr>/<td> for rows.
        Do NOT use Markdown.
        """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Context:\n{context_text}\n\nQuery: {user_query}")
        ]

        try:
            response = self.llm.invoke(messages)
            return response.content, sources
        except Exception as e:
            return f"Error generating answer: {e}", sources

# Singleton instance
case_engine = SupremeCourtRAG()

# --- TEST BLOCK ---
if __name__ == "__main__":
    print("\n[TEST] Testing Supreme Court RAG...")
    
    question = "What is the scope of fundamental rights in emergency?"
    print(f"\n[QUERY] Asking: {question}")
    
    answer, sources = case_engine.chat(question)
    
    print("\n[ANSWER]:")
    print(answer)
    
    print("\n[SOURCES]:")
    for s in sources:
        print(f" - {s['preview']}")