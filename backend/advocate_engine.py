from typing import Annotated, TypedDict, List
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from rag_engine import rag_engine
from ollama_model import create_chat_model

# DEFINE THE STATE
class AdvocateState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    context: str
    case_summary: str
    simulation: str

# ADVOCATE AGENT CLASS
class AdvocateAgent:
    def __init__(self):
        self.llm = create_chat_model(temperature=0.3)

    def research_node(self, state: AdvocateState):
        """Node 1: Fetches legal context."""
        print("🔍 Researcher: Fetching Statutes & Mitigating Factors...")
        query = f"mitigating factors and sentencing for: {state['case_summary']}"
        context, _ = rag_engine.query(query)
        return {"context": context}

    def interrogator_node(self, state: AdvocateState):
        """Node 2: Predicts courtroom questions."""
        print("⚖️  Interrogator: Predicting Judge's Questions...")
        
        system_prompt = (
            f"Based on the law: {state['context']}, "
            "what are 3 critical, distinct questions a judge will ask this convict? "
            "Be specific and focus on legal merit, remorse, and rehabilitation potential."
        )
        
        prompt = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state['case_summary'])
        ]
        response = self.llm.invoke(prompt)
        return {"messages": [response]}

    def counsel_node(self, state: AdvocateState):
        """Node 3: Generates the Q&A Simulation."""
        print("🛡️  Counsel: Drafting Courtroom Simulation...")
        questions = state['messages'][-1].content
        
        counsel_prompt = f"""
You are a Defense Counsel representing a first-time offender. 
Legal Context: {state['context']}

Task:
Take the Judge's questions provided below and simulate a courtroom dialogue. 
For each question, provide a persuasive, legally grounded answer.

Format Requirement:
**Judge:** [Question 1]
**Counsel:** [Your Professional Rebuttal 1]

**Judge:** [Question 2]
**Counsel:** [Your Professional Rebuttal 2]

**Judge:** [Question 3]
**Counsel:** [Your Professional Rebuttal 3]

Mandatory Guidelines:
- In one of your answers, explicitly cite **BNSS Section 479** regarding probation for first-time offenders if applicable
- Keep answers professional, concise and show genuine remorse
- Emphasize rehabilitation over punishment where appropriate
- Reference the specific legal context provided
- Maintain courtroom decorum and respect
"""

        prompt = [
            SystemMessage(content=counsel_prompt),
            HumanMessage(content=f"Judge's Questions:\n{questions}")
        ]
        response = self.llm.invoke(prompt)
        return {"messages": [response], "simulation": response.content}

    def create_graph(self):
        """Build and compile the LangGraph workflow."""
        builder = StateGraph(AdvocateState)
        
        builder.add_node("researcher", self.research_node)
        builder.add_node("interrogator", self.interrogator_node)
        builder.add_node("counsel", self.counsel_node)
        
        builder.add_edge(START, "researcher")
        builder.add_edge("researcher", "interrogator")
        builder.add_edge("interrogator", "counsel")
        builder.add_edge("counsel", END)
        
        return builder.compile()

    def generate_simulation(self, case_summary: str) -> dict:
        """
        Main method to generate courtroom simulation.
        Returns: dict with simulation text, context, and questions
        """
        try:
            app = self.create_graph()
            
            print("🚀 Starting Legal Advocate Chain...")
            final_state = app.invoke(
                {"case_summary": case_summary, "messages": []}
            )
            
            if final_state["messages"] and len(final_state["messages"]) >= 2:
                return {
                    "simulation": final_state["simulation"],
                    "context": final_state.get("context", ""),
                    "questions": final_state["messages"][-2].content,  # Interrogator's questions
                    "status": "success"
                }
            else:
                return {
                    "simulation": "No simulation generated",
                    "context": "",
                    "questions": "",
                    "status": "error"
                }
        except Exception as e:
            print(f"❌ Error in advocate agent: {str(e)}")
            return {
                "simulation": f"Error: {str(e)}",
                "context": "",
                "questions": "",
                "status": "error"
            }

# Create singleton instance
advocate_engine = AdvocateAgent()

# Test execution
if __name__ == "__main__":
    test_case = "First-time offender, age 21, convicted for Shoplifting (BNS 303). Value of goods: Rs. 2000. No prior criminal record."
    
    result = advocate_engine.generate_simulation(test_case)
    
    print("\n" + "="*50)
    print("⚖️  COURTROOM SIMULATION TRANSCRIPT")
    print("="*50)
    print(result["simulation"])