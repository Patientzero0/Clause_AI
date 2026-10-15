import os
from dotenv import load_dotenv

# Try to import required packages
try:
    from langchain_community.tools.tavily_search import TavilySearchResults
    from ollama_model import create_chat_model
    LANGCHAIN_BASIC_AVAILABLE = True
except ImportError as e:
    print(f"[ERROR] Missing basic packages: {e}")
    LANGCHAIN_BASIC_AVAILABLE = False

# Try to import agent packages (may fail due to version issues)
AGENT_AVAILABLE = False
try:
    from langchain.agents import AgentExecutor, create_react_agent
    from langchain import hub
    AGENT_AVAILABLE = True
except ImportError as e:
    print(f"[WARNING] Agent packages not available: {e}")
    print("[INFO] Web search will use simple direct search mode (no agents)")
    AGENT_AVAILABLE = False

LANGCHAIN_AVAILABLE = LANGCHAIN_BASIC_AVAILABLE

load_dotenv()


class WebSearchEngine:
    def __init__(self):
        if not LANGCHAIN_AVAILABLE:
            print("[ERROR] LangChain dependencies not available. Cannot initialize.")
            self.executor = None
            return
            
        self.tavily_key = os.getenv("TAVILY_API_KEY")

        if not self.tavily_key:
            print("[WARNING] Missing Tavily API key in .env")
            print("Required in .env file:")
            print("  TAVILY_API_KEY=your_key_here")
            self.executor = None
            return

        # 1. Initialize LLM
        try:
            self.llm = create_chat_model()
            print("[SUCCESS] Ollama LLM initialized")
        except Exception as e:
            print(f"[ERROR] LLM initialization failed: {e}")
            self.executor = None
            return

        # 2. Initialize Tools
        try:
            # Try newer import first
            try:
                from langchain_tavily import TavilySearchResults
            except ImportError:
                from langchain_community.tools.tavily_search import TavilySearchResults
            
            self.tools = [TavilySearchResults(
                max_results=5,
                tavily_api_key=self.tavily_key  
            )]
            print("[SUCCESS] Tavily Search tool initialized")
        except Exception as e:
            print(f"[ERROR] Could not load Tavily Tools: {e}")
            self.tools = []
            self.executor = None
            return

        # 3. Create Agent (if available)
        self.executor = None
        if AGENT_AVAILABLE:
            try:
                # Load Prompt from Hub
                try:
                    prompt = hub.pull("hwchase17/react")
                    print("[SUCCESS] Loaded ReAct prompt from LangChain Hub")
                except Exception as e:
                    print(f"[WARNING] Could not load prompt from hub: {e}")
                    print("Using fallback prompt...")
                    prompt = self._create_fallback_prompt()

                # Create Agent
                agent = create_react_agent(
                    llm=self.llm,
                    tools=self.tools,
                    prompt=prompt
                )
                print("[SUCCESS] ReAct Agent created")

                # Create Executor
                self.executor = AgentExecutor(
                    agent=agent,
                    tools=self.tools,
                    verbose=True,
                    handle_parsing_errors=True,
                    max_iterations=5,
                    return_intermediate_steps=False
                )
                print("[SUCCESS] Agent Executor ready")
                
            except Exception as e:
                print(f"[WARNING] Agent creation failed: {e}")
                print("[INFO] Will use simple direct search instead")
                self.executor = None
        else:
            print("[INFO] Agents not available - using simple direct search mode")

    def _create_fallback_prompt(self):
        """Fallback prompt if hub is unavailable"""
        from langchain_core.prompts import PromptTemplate
        
        template = """Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

SPECIAL INSTRUCTIONS FOR LEGAL QUERIES:
- Search for LATEST information (2024-2026)
- ALWAYS cite sources with URLs
- If information is not found, clearly state that

Begin!

Question: {input}
Thought:{agent_scratchpad}"""

        return PromptTemplate.from_template(template)

    def web_chat(self, query: str):
        """Execute web search query using the agent (if available)"""
        if not self.executor:
            # Fallback to simple search if agent not available
            return self.simple_search(query)
        
        try:
            result = self.executor.invoke({"input": query})
            return result["output"]
        except Exception as e:
            print(f"[WARNING] Agent execution failed: {e}")
            print("[INFO] Falling back to simple search...")
            return self.simple_search(query)

    def simple_search(self, query: str):
        """Direct tool call without agent (simpler, more reliable)"""
        if not hasattr(self, 'tools') or not self.tools:
            return {"answer": "Search tools not available. Please check Tavily API key.", "sources": []}
        
        try:
            search_tool = self.tools[0]
            # TavilySearchResults expects a dict with 'query' key
            results = search_tool.invoke({"query": query})
            
            # Format results structure
            sources = []
            context_text = ""
            
            if isinstance(results, list):
                for i, result in enumerate(results, 1):
                    if isinstance(result, dict):
                        content = result.get('content', result.get('text', ''))
                        url = result.get('url', '#')
                        title = result.get('title', 'Web Result')
                        
                        sources.append({
                            "title": title,
                            "url": url,
                            "content": content[:150] + "..."
                        })
                        context_text += f"Source {i}: {content}\n\n"
            
            # Use LLM to synthesize an answer if possible, otherwise return top result snippet
            # For speed in simple mode, we might just return a synthesized summary if we had an LLM call here.
            # But `simple_search` was originally just returning raw results. 
            # To make it "Gemini-like", let's try to do a quick synthesis if LLM is ready, 
            # otherwise just return the snippets.
            
            # Use LLM to synthesize an answer if possible
            answer = "Here are the top search results:"
            
            # TRUNCATE COMPACT CONTEXT to avoid token limits (common cause of failure)
            if len(context_text) > 4000:
                context_text = context_text[:4000] + "...(truncated)"

            if self.llm and context_text:
                try:
                    from langchain_core.messages import SystemMessage, HumanMessage
                    messages = [
                        SystemMessage(content="You are a helpful assistant. Summarize the following search results to answer the user query. Be concise."),
                        HumanMessage(content=f"Query: {query}\n\nResults:\n{context_text}")
                    ]
                    resp = self.llm.invoke(messages)
                    answer = resp.content
                except Exception as e:
                    print(f"[ERROR] Summarization failed: {e}")
                    # FALLBACK: Create a manual summary from snippets instead of showing an error message
                    answer = "Here are the key findings from the web:\n\n"
                    for s in sources[:3]:
                        answer += f"- **{s['title']}**: {s['content']}\n"
                    answer += "\n(Summarization unavailable, showing snippets)"

            return {
                "answer": answer,
                "sources": sources
            }

        except Exception as e:
            return {"answer": f"Search failed: {str(e)}", "sources": []}


# Singleton Instance
web_engine = WebSearchEngine()


# --- TESTING ---
if __name__ == "__main__":
    print("\n" + "="*70)
    print("🔬 WEB SEARCH ENGINE TEST SUITE")
    print("="*70)
    
    if not LANGCHAIN_AVAILABLE:
        print("\n[ERROR] Cannot run tests - missing basic dependencies")
        print("\nInstall with:")
        print("pip install langchain-ollama langchain-community tavily-python python-dotenv")
        exit(1)
    
    if not web_engine.executor and not web_engine.tools:
        print("\n❌ Cannot run tests - engine not initialized")
        print("Check API keys in .env file")
        exit(1)
    
    # Test 1: Simple Search (More reliable)
    print("\n[TEST 1] Simple Direct Search")
    print("-" * 70)
    res1 = web_engine.simple_search("Current Chief Justice of India 2025")
    print(f"\n{res1}\n")
    
    # Test 2: Agent Search (If executor available)
    if web_engine.executor:
        print("\n[TEST 2] Agent-Based Search")
        print("-" * 70)
        res2 = web_engine.web_chat("Who is the current Chief Justice of India in 2025?")
        print(f"\n✅ Answer:\n{res2}\n")
        
        print("\n[TEST 3] Legal Updates Search")
        print("-" * 70)
        res3 = web_engine.web_chat("Latest updates on Bharatiya Nyaya Sanhita 2024-2025")
        print(f"\n✅ Answer:\n{res3}\n")
    else:
        print("\n⚠️  Agent executor not available, skipping agent tests")
    
    print("="*70)
    print("✅ Tests completed!")
    print("="*70)