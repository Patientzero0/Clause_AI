import os
import requests
import json
from dotenv import load_dotenv
from tavily import TavilyClient
from langchain_core.messages import SystemMessage, HumanMessage
from ollama_model import create_chat_model

# Load API Keys
load_dotenv()

class LawyerSearchEngine:
    def __init__(self):
        print("\n[INFO] Initializing Lawyer Search Engine...")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.tavily_client = TavilyClient(api_key=self.tavily_api_key) if self.tavily_api_key else None
        
        # Initialize Ollama for fallback parsing
        try:
            self.llm = create_chat_model()
        except Exception as e:
            print(f"[WARNING] Could not initialize Ollama: {e}")
            self.llm = None

        if not self.google_api_key:
            print("[WARNING] GOOGLE_API_KEY missing. Gemini search will be skipped.")

    def find_lawyers(self, query: str, user_location: str = None):
        """
        Attempts to find lawyers using:
        1. Google Gemini Maps Grounding (Priority)
        2. Fallback: Tavily Web Search + Ollama Extraction
        """
        final_query = query
        if user_location:
            final_query = f"{query} near {user_location}"

        # 1. Try Gemini (Maps Grounding)
        if self.google_api_key:
            try:
                print(f"[INFO] Attempting Gemini Maps Grounding for: {final_query}")
                result = self._query_gemini(final_query)
                if result and "Error" not in result[:20]:
                    return result
                print(f"[WARNING] Gemini failed: {result}")
            except Exception as e:
                print(f"[ERROR] Gemini Exception: {e}")

        # 2. Fallback to Tavily
        print("[INFO] Switching to Tavily + Ollama Fallback...")
        return self._search_with_tavily(final_query)

    def _query_gemini(self, query):
        # JSON Schema Prompt
        prompt = f"""
        Find 5-10 real lawyers matching: "{query}".
        Return strict JSON list of objects.
        Keys: "name", "address", "rating" (string), "specialization", "lat" (number/null), "lng" (number/null).
        No markdown.
        """

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={self.google_api_key}"
        
        headers = {
            "Content-Type": "application/json",
            "Referer": "http://localhost:5173/", # Bypass referrer block
            "Origin": "http://localhost:5173"
        }

        data = {
            "contents": [{"parts": [{"text": prompt}]}],
            "tools": [{"google_search_retrieval": {"dynamic_retrieval_config": {"mode": "dynamic", "dynamic_threshold": 0.7}}}],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code != 200:
            return f"Error: {response.status_code} {response.text}"
            
        result_json = response.json()
        try:
            return result_json["candidates"][0]["content"]["parts"][0]["text"]
        except:
            return "Error parsing Gemini response"

    def _search_with_tavily(self, query):
        if not self.tavily_client:
            return json.dumps([{"name": "System Error", "address": "Tavily API Key missing", "specialization": "Config Error"}])

        try:
            # 1. Search Web
            search_result = self.tavily_client.search(
                query=query, 
                search_depth="advanced", 
                max_results=8,
                include_answer=False
            )
            context = str(search_result.get("results", []))

            # 2. Parse locally with Ollama
            if not self.llm:
                 return json.dumps([{"name": "Error", "address": "LLM not initialized", "specialization": "Backend Error"}])

            sys_msg = """
            You are a data extraction assistant.
            Extract lawyer details from the provided search results.
            Return a STRICT JSON LIST of objects. 
            Keys: 
            - "name" (Lawyer/Firm Name)
            - "address" (Location/Address - infer from snippet if possible)
            - "rating" (Ex: "4.8", or "N/A")
            - "specialization" (Ex: "Criminal", "Civil", "General")
            - "lat" (null)
            - "lng" (null)

            Do NOT use markdown. Return ONLY the JSON string.
            """
            
            resp = self.llm.invoke([
                SystemMessage(content=sys_msg),
                HumanMessage(content=f"Search Results: {context}")
            ])
            
            # Clean response
            clean_text = resp.content.replace("```json", "").replace("```", "").strip()
            return clean_text

        except Exception as e:
            return json.dumps([{"name": "Search Failed", "address": str(e), "specialization": "Error"}])

# Singleton
lawyer_engine = LawyerSearchEngine()

if __name__ == "__main__":
    print(lawyer_engine.find_lawyers("Lawyers in Connaught Place Delhi"))
