from langchain_core.prompts import ChatPromptTemplate
from rag_engine import rag_engine

class ComparisonAgent:
    def __init__(self):
        self.rag = rag_engine
        self.llm = self.rag.llm  # Reuse the LLM from rag_engine

    def compare(self, user_query: str):
        # 1. Retrieve Context (Dual Search for better recall)
        docs = []
        try:
            # Search 1: Original Query (Standard RAG)
            docs_general = self.rag._hybrid_retrieve(user_query)
            
            # Search 2: Explicit IPC/BNS targeting
            # If query is "Section 302", we add "BNS" to try and catch the new law
            # If query is "Murder", we add "IPC" and "BNS" context
            
            docs_bns = self.rag._hybrid_retrieve(f"{user_query} BNS Bharatiya Nyaya Sanhita")
            docs_ipc = self.rag._hybrid_retrieve(f"{user_query} IPC Indian Penal Code")
            
            # Combine and deduplicate based on page_content
            seen = set()
            for d in docs_general + docs_bns + docs_ipc:
                if d.page_content not in seen:
                    seen.add(d.page_content)
                    docs.append(d)
                    
        except Exception as e:
            print(f"Error in comparison retrieval: {e}")
            docs = []

            
        context_text = "\n\n".join([f"[{d.metadata.get('law_type','Gen')}] {d.page_content}" for d in docs])

        # 2. Define System Prompt for JSON
        sys_prompt = """You are a Legal Comparison Expert. Compare the IPC and BNS provisions based on the context.
        
        OUTPUT FORMAT: JSON ONLY. Do not output any markdown formatting like ```json ... ```. Just the raw JSON object.
        
        Structure:
        {{
            "summary": "A concise summary of the major changes.",
            "comparisons": [
                {{
                    "feature": "Name of the feature/aspect (e.g., Punishment, Definition)",
                    "ipc": "IPC provision details (Section # if avail)",
                    "bns": "BNS provision details (Section # if avail)",
                    "key_change": "Description of the change",
                    "impact": "High | Medium | Low"
                }}
            ]
        }}
        
        If context is missing, provide a comparison based on your general knowledge of IPC and BNS.
        """

        # 3. Construct Prompt
        final_user_prompt = f"""Context:
{context_text}

Query: {user_query}

Generate the comparison JSON."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", sys_prompt),
            ("user", final_user_prompt)
        ])

        # 4. Invoke LLM
        chain = prompt | self.llm
        response = chain.invoke({})
        
        # 5. Parse JSON
        import json
        content = response.content.strip()
        # Clean potential markdown code blocks if the model ignores instructions
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        try:
            data = json.loads(content.strip())
            return data
        except json.JSONDecodeError:
            # Fallback for parsing error
            return {
                "summary": "Error parsing model response however the raw content is below.",
                "comparisons": [],
                "raw_content": content
            }

# Singleton instance
comparison_agent = ComparisonAgent()
