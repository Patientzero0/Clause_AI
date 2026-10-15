import os
import re 
import pickle
from typing import Iterator
import chromadb 
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document
from dotenv import load_dotenv
from ollama_model import create_chat_model

load_dotenv()

# --- CONFIGURATION ---
DB_PATH = "./chroma_db"
BM25_PATH = "./bm25_index.pkl"
EMBEDDING_MODEL = "AkshitaS/bhasha-embed-v0"

class LegalRAG:
    def __init__(self):
        print("\n[INFO] Initializing Legal RAG (Manual Hybrid Mode)...")
        
        # 1. Initialize LLM
        self.llm = create_chat_model()

        # 2. Load Embeddings
        print("    Loading Embeddings...")
        self.embedding_model = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )

        # 3. Load Semantic Retriever (Chroma)
        print("    Loading ChromaDB...")
        self.vectorstore = Chroma(
            collection_name="legal_corpus",
            embedding_function=self.embedding_model,
            persist_directory=DB_PATH
        )
        self.semantic_retriever = self.vectorstore.as_retriever(search_kwargs={"k": 5})

        # 4. Load BM25 Retriever (Pickle)
        self.bm25_retriever = None
        if os.path.exists(BM25_PATH):
            print(f"    Loading BM25 Index from {BM25_PATH}...")
            try:
                with open(BM25_PATH, "rb") as f:
                    self.bm25_retriever = pickle.load(f)
                    self.bm25_retriever.k = 5
                print("[SUCCESS] BM25 Loaded Successfully.")
            except Exception as e:
                print(f"[WARNING] BM25 Load Failed: {e}")
        else:
            print("[WARNING] BM25 Index not found. Semantic Only.")

    def _extract_section_number(self, text):
        pattern = r"(?:Section|Sec\.?)\s+([0-9]+[A-Za-z]*(?:\([0-9A-Za-z]+\))?)"
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            return ", ".join(sorted(set(matches)))
        return "N/A"

    def _is_hindi(self, text):
        """
        Checks for Devanagari Unicode range OR explicit requests for Hindi.
        """
        # Check for Devanagari script
        if re.search(r'[\u0900-\u097F]', text):
            return True
            
        # Check for explicit keywords
        text_lower = text.lower()
        hindi_keywords = ["in hindi", "hindi mein", "hindi me", "translate to hindi", "explain in hindi"]
        return any(keyword in text_lower for keyword in hindi_keywords)

    def _hybrid_retrieve(self, query_text):
        # A. Semantic Search
        try:
            semantic_docs = self.semantic_retriever.invoke(query_text)
        except Exception as e:
            print(f"[ERROR] Semantic Error: {e}")
            semantic_docs = []

        # B. Keyword Search
        bm25_docs = []
        if self.bm25_retriever:
            try:
                bm25_docs = self.bm25_retriever.invoke(query_text)
            except Exception as e:
                print(f"[ERROR] BM25 Error: {e}")

        # C. Merge & Deduplicate
        seen_signatures = set()
        final_docs = []
        for doc in semantic_docs + bm25_docs:
            source = doc.metadata.get("source_file", "unknown")
            content_snippet = doc.page_content[:100]
            signature = f"{source}_{content_snippet}"
            
            if signature not in seen_signatures:
                seen_signatures.add(signature)
                final_docs.append(doc)
        
        return final_docs[:7] 

    def _prepare_query(self, user_query: str):
        docs = self._hybrid_retrieve(user_query)[:3]
        context_text = "\n\n".join(
            f"[{doc.metadata.get('law_type', 'Gen')}] {doc.page_content[:1800]}"
            for doc in docs
        )

        if self._is_hindi(user_query):
            lang_instruction = "The user requested HINDI. You MUST answer in HINDI."
        else:
            lang_instruction = "Answer in the language of the user's query. If the user asks for a specific language, follow that."

        sys_prompt = """You are Samvidhan AI, an Indian legal information assistant.
Answer concisely in at most 180 words, based on the supplied context. Cite section numbers when present.
If the context does not answer the question, say so clearly instead of guessing."""
        final_user_prompt = f"""Context:
{context_text}

Query: {user_query}

OUTPUT INSTRUCTION: {lang_instruction}"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", sys_prompt),
            ("user", final_user_prompt)
        ])
        sources = []
        for doc in docs:
            sources.append({
                "file_name": doc.metadata.get("source_file", "Unknown"),
                "law_type": doc.metadata.get("law_type", "General"),
                "section": self._extract_section_number(doc.page_content),
                "preview": doc.page_content
            })
        return prompt, sources

    def query(self, user_query: str, mode: str = "auto"):
        prompt, sources = self._prepare_query(user_query)
        response = (prompt | self.llm).invoke({})
        return response.content, sources

    def stream_query(self, user_query: str, mode: str = "auto") -> tuple[list, Iterator[str]]:
        prompt, sources = self._prepare_query(user_query)

        def answer_chunks():
            for chunk in (prompt | self.llm).stream({}):
                if isinstance(chunk.content, str) and chunk.content:
                    yield chunk.content

        return sources, answer_chunks()

# Global Singleton
rag_engine = LegalRAG()

if __name__ == "__main__":
    print("\n[TEST] Testing Manual Hybrid RAG...")
    
    q1 = "What is the punishment for Snatching in BNS?"
    print(f"\n[QUERY 1] (Eng): {q1}")
    res1, _ = rag_engine.query(q1)
    print(f"[ANSWER]:\n{res1}")

    print("-" * 30)

    q2 = "BNS mein snatching ki saza kya hai?"
    print(f"\n[QUERY 2] (Hin): {q2}")
    res2, _ = rag_engine.query(q2)
    print(f"[ANSWER]:\n{res2}")