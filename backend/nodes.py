import os
import operator
import json
from typing import Annotated, List, TypedDict, Union
from dotenv import load_dotenv
from supabase import create_client
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_huggingface import HuggingFaceEmbeddings
from ollama_model import create_chat_model

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

llm = create_chat_model(temperature=0.1)

embeddings = HuggingFaceEmbeddings(
    model_name="jinaai/jina-embeddings-v2-base-en",
    model_kwargs={"device": "cpu", "trust_remote_code": True},
    encode_kwargs={"normalize_embeddings": True}
)


class AgentState(TypedDict, total=False):
    query: str
    messages: Annotated[List[Union[HumanMessage, AIMessage]], operator.add]
    context: str
    reference_clause: str
    final_draft: str
    phase: str
    missing_info: List[str]
    clarification_question: str
    intent: str


def guardrail_node(state: AgentState):
    prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are the gatekeeper for Clause.ai.

Classify the user input into exactly one category.

GREETING
OFF_TOPIC
LEGAL_REQUEST

Return ONLY valid JSON.

Format:
{{
  "classification": "GREETING | OFF_TOPIC | LEGAL_REQUEST",
  "response": "string"
}}

Rules:
GREETING gets a polite intro.
OFF_TOPIC gets a refusal.
LEGAL_REQUEST response must be empty.
"""
    ),
    ("human", "{query}")
])

    raw = (prompt | llm).invoke({"query": state["query"]}).content.strip()

    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        data = json.loads(raw[start:end])
    except Exception:
        return {
            "intent": "chat",
            "phase": "chat",
            "final_draft": "",
            "context": "",
            "reference_clause": "",
            "clarification_question": "Hello. I am Clause.ai. How can I help with legal drafting today?"
        }

    classification = data.get("classification")

    if classification == "LEGAL_REQUEST":
        return {
            "intent": "legal",
            "phase": "legal"
        }

    return {
        "intent": "chat",
        "phase": "chat",
        "final_draft": "",
        "context": "",
        "reference_clause": "",
        "clarification_question": data.get("response", "")
    }


def triage_node(state: AgentState):
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """
You are a Legal Intake AI.

If the user provided any concrete parameters, output READY.

If vague, output 3 to 5 critical missing variables as a comma separated list.
"""
        ),
        ("human", "{query}")
    ])

    result = (prompt | llm).invoke({"query": state["query"]}).content.strip()

    if "READY" in result:
        return {
            "phase": "drafting",
            "missing_info": []
        }

    missing_items = [
        item.strip().replace("-", "").replace("*", "")
        for item in result.split(",")
        if item.strip()
    ][:5]

    return {
        "phase": "planning",
        "missing_info": missing_items,
        "clarification_question": "I can draft that. Please confirm or skip to use defaults."
    }


def retrieve_node(state: AgentState):
    query_vector = embeddings.embed_query(state["query"])

    response = supabase.rpc(
        "match_parent_documents",
        {
            "query_embedding": query_vector,
            "match_threshold": 0.5,
            "match_count": 1
        }
    ).execute()

    if response.data:
        content = response.data[0]["content"]
        return {
            "context": content,
            "reference_clause": content
        }

    return {
        "context": "Standard commercial terms apply.",
        "reference_clause": "None found."
    }

def draft_node(state: AgentState):
    """
    Writes the final clause. 
    Crucial: Takes the User Query + Context and enforces strict formatting.
    """
    print("✍️ Drafting Clause...")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
        You are a Senior Legal Drafter. 
        Draft a high-quality legal clause based on the User Request and the Reference Context.
        
        STRICT FORMATTING RULES (CRITICAL):
        1. **HEADERS:** Use **Bold Uppercase** for all Section Headings (e.g., **1. DEFINITIONS**).
        2. **SPACING:** Add a blank line between every paragraph.
        3. **LISTS:** Use proper Markdown lists for subsections:
           (a) First item...
           (b) Second item...
        4. **NO CODE BLOCKS:** Do NOT wrap the output in ```markdown or ```. Return raw text only.
        5. **NO SEPARATORS:** Do NOT use horizontal rules (---) or long lines of dashes (________________). They break the PDF renderer.
        6. **DEFAULTS:** If a detail is missing in the request, use a reasonable market standard default.
        
        [REFERENCE CONTEXT]:
        {context}

        [CONVERSATION HISTORY]:
        {history}
        """),
        ("human", "{query}")
    ])
    
    # Format history as string for the prompt
    history_text = "\n".join([f"{m.type.upper()}: {m.content}" for m in state.get('messages', [])])
    
    result = (prompt | llm).invoke({"context": state['context'], "query": state['query'], "history": history_text})
    return {"final_draft": result.content}