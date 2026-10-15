import os
import requests
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from ollama_model import create_chat_model

load_dotenv()

# CONFIG
AIRTOP_API_KEY = os.getenv("AIRTOP_API_KEY")
BASE_URL = "https://api.airtop.ai/v1"

class AirtopBrowser:
    """Airtop Browser Agent for Web Scraping"""
    def __init__(self, api_key: str):
        self.headers = {
            "Authorization": f"Bearer {api_key}", 
            "Content-Type": "application/json"
        }
        self.session_id = None
        self.window_id = None

    def start_browser(self):
        """Create a browser session"""
        try:
            res = requests.post(
                f"{BASE_URL}/sessions", 
                headers=self.headers, 
                json={"configuration": {"timeoutMinutes": 10}},
                timeout=30
            )
            if res.status_code == 200:
                self.session_id = res.json()["data"]["id"]
                print(f"🚀 Browser Session Started: {self.session_id}")
                return True
            else:
                print(f"❌ Failed to start browser: {res.status_code}")
                return False
        except Exception as e:
            print(f"❌ Browser start error: {str(e)}")
            return False

    def ai_page_query(self, target_url: str, ai_prompt: str):
        """Uses Airtop's AI-Native Page Query"""
        if not self.session_id:
            return None
        
        try:
            # Create Window
            win_res = requests.post(
                f"{BASE_URL}/sessions/{self.session_id}/windows", 
                headers=self.headers, 
                json={"url": target_url},
                timeout=30
            )
            
            if win_res.status_code != 200:
                print(f"❌ Failed to create window: {win_res.status_code}")
                return None
                
            self.window_id = win_res.json()["data"]["id"]
            
            # AI Query
            query_url = f"{BASE_URL}/sessions/{self.session_id}/windows/{self.window_id}/page-query"
            payload = {"prompt": ai_prompt}
            
            print(f"🧠 AI Agent analyzing: {target_url}...")
            res = requests.post(query_url, headers=self.headers, json=payload, timeout=60)
            
            if res.status_code == 200:
                return res.json().get("data", {}).get("modelResponse")
            else:
                print(f"❌ Page query failed: {res.status_code}")
                return None
        except Exception as e:
            print(f"❌ Page query error: {str(e)}")
            return None

    def close(self):
        """Close the browser session"""
        if self.session_id:
            try:
                requests.delete(
                    f"{BASE_URL}/sessions/{self.session_id}", 
                    headers=self.headers,
                    timeout=10
                )
                print("🔒 Browser session closed")
            except Exception as e:
                print(f"⚠️ Failed to close browser: {str(e)}")

# LANGGRAPH STATE
class SamvidhanState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    query: str
    user_domain: str
    domain: str
    scraped_content: str
    sources: List[str]
    answer: str

# AGENT NODES
class SamvidhanAgent:
    def __init__(self):
        self.llm = create_chat_model()
        self.airtop_key = AIRTOP_API_KEY

    def classifier_node(self, state: SamvidhanState):
        """Detect Law Type (IT Act, Companies Act, etc.)"""
        # If user provided a specific domain, use it (or refine it)
        user_domain = state.get("user_domain")
        
        if user_domain and user_domain != "All":
            print(f"📋 Using User Domain: {user_domain}")
            return {"domain": user_domain}

        try:
            prompt = f"Identify the Indian Legal Domain (e.g. IT Act, Companies Act, BNS, IPC) for: '{state['query']}'. Return just the domain name in 2-4 words."
            res = self.llm.invoke(prompt)
            domain = res.content.strip()
            print(f"📋 Classified Domain: {domain}")
            return {"domain": domain}
        except Exception as e:
            print(f"⚠️ Classifier error: {str(e)}")
            return {"domain": "General Indian Law"}

    def researcher_node(self, state: SamvidhanState):
        """Web Search using Airtop AI"""
        if not self.airtop_key:
            print("⚠️ Airtop API key not found, skipping web search")
            return {
                "scraped_content": "Web search unavailable - Airtop API key missing",
                "sources": []
            }
        
        browser = AirtopBrowser(self.airtop_key)
        
        if not browser.start_browser():
            return {
                "scraped_content": "Failed to start browser session",
                "sources": []
            }
        
        try:
            # Search India Code
            search_url = f"https://www.indiacode.nic.in/simple-search?query={state['query'].replace(' ', '+')}"
            ai_instruction = (
                "Extract the full text of the most relevant Act and Section. "
                "Include the Section Number and exact legal wording. "
                "If multiple sections are relevant, include all of them."
            )
            
            legal_data = browser.ai_page_query(search_url, ai_instruction)
            
            if legal_data:
                return {
                    "scraped_content": legal_data,
                    "sources": [search_url]
                }
            else:
                return {
                    "scraped_content": "No relevant legal data found on India Code",
                    "sources": [search_url]
                }
        except Exception as e:
            print(f"❌ Research error: {str(e)}")
            return {
                "scraped_content": f"Research failed: {str(e)}",
                "sources": []
            }
        finally:
            browser.close()

    def final_answer_node(self, state: SamvidhanState):
        """Generate formatted answer with citations"""
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are Samvidhan AI, an expert on Indian law. 
                
Format your answer professionally with Markdown:
1. Start with a brief summary
2. Provide detailed explanation
3. Include relevant section numbers and legal citations
4. End with a 'SOURCES' section listing the URLs

Be precise, professional, and cite specific legal provisions."""),
                ("user", """Domain: {domain}
Legal Context: {content}
Question: {question}
Source URLs: {urls}

Provide a comprehensive answer based on the legal context above.""")
            ])
            
            chain = prompt | self.llm
            res = chain.invoke({
                "domain": state["domain"],
                "content": state["scraped_content"],
                "question": state["query"],
                "urls": ", ".join(state["sources"]) if state["sources"] else "No sources available"
            })
            
            return {
                "messages": [res],
                "answer": res.content
            }
        except Exception as e:
            print(f"❌ Answer generation error: {str(e)}")
            return {
                "messages": [],
                "answer": f"Error generating answer: {str(e)}"
            }

    def create_graph(self):
        """Build the LangGraph workflow"""
        workflow = StateGraph(SamvidhanState)
        
        workflow.add_node("classifier", self.classifier_node)
        workflow.add_node("researcher", self.researcher_node)
        workflow.add_node("responder", self.final_answer_node)
        
        workflow.add_edge(START, "classifier")
        workflow.add_edge("classifier", "researcher")
        workflow.add_edge("researcher", "responder")
        workflow.add_edge("responder", END)
        
        return workflow.compile()

    def search_law(self, query: str, domain: str = None) -> dict:
        """
        Main method to search Indian law databases.
        Returns: dict with answer, sources, and domain
        """
        try:
            app = self.create_graph()
            
            print(f"📝 Samvidhan Query: {query} | Domain: {domain}")
            final_state = app.invoke({
                "query": query, 
                "user_domain": domain,
                "messages": [], 
                "sources": []
            })
            
            return {
                "answer": final_state.get("answer", "No answer generated"),
                "sources": final_state.get("sources", []),
                "domain": final_state.get("domain", "Unknown"),
                "scraped_content": final_state.get("scraped_content", ""),
                "status": "success"
            }
        except Exception as e:
            print(f"❌ Error in Samvidhan agent: {str(e)}")
            return {
                "answer": f"Error: {str(e)}",
                "sources": [],
                "domain": "Error",
                "scraped_content": "",
                "status": "error"
            }

# Create singleton instance
samvidhan_engine = SamvidhanAgent()

# Test execution
if __name__ == "__main__":
    test_query = "What are the rules for data privacy in fintech?"
    
    result = samvidhan_engine.search_law(test_query)
    
    print("\n" + "="*50)
    print("📜 SAMVIDHAN AI RESPONSE")
    print("="*50)
    print(f"Domain: {result['domain']}")
    print(f"\nAnswer:\n{result['answer']}")
    print(f"\nSources: {result['sources']}")