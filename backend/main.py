import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Load env vars
load_dotenv()

# Import local modules
from models import QueryRequest, QueryResponse, SummarizeResponse
from rag_engine import rag_engine
from summarizer import summarize_legal_doc

# Existing Engines
from court_cases.engine import case_engine
from comparison_agent import comparison_agent
from lawyers.engine import lawyer_engine

# NEW: Import the refined agents
from advocate_engine import advocate_engine
from samvidhan_engine import samvidhan_engine

# LangGraph import for Clause.ai
from graph import app_graph

# Web engine import is optional
try:
    from web_engine import web_engine
    WEB_ENGINE_AVAILABLE = True
except ImportError as e:
    print(f"[WARNING] Web engine not available: {e}")
    web_engine = None
    WEB_ENGINE_AVAILABLE = False

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Legal RAG API + Clause.ai", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

PDF_DIRECTORY = Path(__file__).parent / "data"

# ===== PYDANTIC MODELS =====

class AdvocateRequest(BaseModel):
    case_summary: str

class AdvocateResponse(BaseModel):
    simulation: str
    context: str
    questions: str
    status: str

class SamvidhanRequest(BaseModel):
    query: str
    domain: Optional[str] = None

class SamvidhanResponse(BaseModel):
    answer: str
    sources: list
    domain: str
    status: str

class DraftRequest(BaseModel):
    query: str
    history: Optional[List[dict]] = [] # List of {"role": "user"|"assistant", "content": "..."}

class AgentResponse(BaseModel):
    status: str
    phase: str
    message: str
    missing_info: List[str] = []
    draft: Optional[str] = None
    reference: Optional[str] = None

# ===== LEGAL RAG API ENDPOINTS =====

@app.get("/")
def health_check():
    return {
        "status": "running", 
        "service": "Legal RAG AI + Clause.ai v2.0",
        "endpoints": [
            "/query - RAG search",
            "/query/court - Supreme Court judgments",
            "/query/comparison - IPC vs BNS comparison",
            "/search/web - Web search",
            "/search/lawyers - Lawyer finder",
            "/summarize - Document summarization",
            "/advocate/simulate - Courtroom simulation",
            "/samvidhan/search - India Code search",
            "/draft - Clause.ai draft generation"
        ]
    }

@app.post("/query", response_model=QueryResponse)
def query_legal_corpus(request: QueryRequest):
    """
    RAG Endpoint: Retrieves context and answers the question.
    """
    try:
        answer, sources = rag_engine.query(request.query, mode=request.mode)
        
        return QueryResponse(
            answer=answer,
            sources=sources,
            mode_used=request.mode
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/stream")
def stream_legal_query(request: QueryRequest):
    def events():
        import json

        yield json.dumps({"status": "retrieving"}, ensure_ascii=False) + "\n"
        try:
            sources, answer_chunks = rag_engine.stream_query(
                request.query,
                mode=request.mode
            )
            yield json.dumps({"sources": sources}, ensure_ascii=False) + "\n"
            for chunk in answer_chunks:
                yield json.dumps({"token": chunk}, ensure_ascii=False) + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}, ensure_ascii=False) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")

@app.post("/query/court")
def query_court_cases(request: QueryRequest):
    """
    RAG Endpoint for Supreme Court Judgments
    """
    try:
        answer, sources = case_engine.chat(request.query)
        
        return {
            "answer": answer,
            "sources": sources,
            "mode_used": "court_rag"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query/comparison")
def query_comparison(request: QueryRequest):
    """
    Comparison Endpoint: Compares IPC and BNS.
    """
    try:
        answer = comparison_agent.compare(request.query)
        return {"answer": answer, "mode_used": "comparison"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/web")
def search_web_agent(request: QueryRequest):
    """
    Web Search Endpoint - Uses simple search for reliability
    """
    if not WEB_ENGINE_AVAILABLE or web_engine is None:
        raise HTTPException(
            status_code=503, 
            detail="Web engine not available. Check dependencies."
        )
    try:
        if web_engine.executor:
            response_payload = web_engine.simple_search(request.query)
        else:
            response_payload = web_engine.simple_search(request.query)
        
        if isinstance(response_payload, dict):
            return {
                "answer": response_payload.get("answer", ""),
                "sources": response_payload.get("sources", []),
                "mode_used": "web_search"
            }
        else:
            return {
                "answer": response_payload,
                "sources": [{"file_name": "Web Search", "preview": "See answer for details"}],
                "mode_used": "web_search"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/lawyers")
def search_lawyers_nearby(request: QueryRequest):
    """
    Lawyer Search Endpoint: Uses Gemini Maps Grounding.
    """
    try:
        result = lawyer_engine.find_lawyers(request.query)
        return {"result": result, "mode_used": "maps_grounding"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_doc(file: UploadFile = File(...)):
    """
    Summarization Endpoint: Upload a PDF and get a structured summary.
    """
    try:
        result_json_str = await summarize_legal_doc(file)
        return {"result": result_json_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/advocate/simulate", response_model=AdvocateResponse)
def generate_courtroom_simulation(request: AdvocateRequest):
    """
    Courtroom Simulation Endpoint
    
    Generates a mock courtroom Q&A simulation for first-time offenders.
    Uses LangGraph to:
    1. Research relevant laws and mitigating factors
    2. Predict judge's questions
    3. Generate defense counsel responses
    
    Example case_summary:
    "First-time offender, age 21, convicted for Shoplifting (BNS 303). 
     Value of goods: Rs. 2000. No prior criminal record."
    """
    try:
        if not request.case_summary or len(request.case_summary.strip()) < 20:
            raise HTTPException(
                status_code=400, 
                detail="case_summary must be at least 20 characters"
            )
        
        result = advocate_engine.generate_simulation(request.case_summary)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["simulation"])
        
        return AdvocateResponse(
            simulation=result["simulation"],
            context=result["context"],
            questions=result["questions"],
            status=result["status"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@app.post("/samvidhan/search", response_model=SamvidhanResponse)
def search_india_code(request: SamvidhanRequest):
    """
    Samvidhan AI - India Code Search Endpoint
    
    Uses Airtop browser automation to scrape India Code (indiacode.nic.in)
    and provide AI-powered legal research.
    
    Features:
    - Automatically classifies legal domain (IT Act, Companies Act, etc.)
    - Uses AI-native page querying for reliable extraction
    - Returns formatted answers with legal citations
    - Includes source URLs
    
    Example query:
    "What are the rules for data privacy in fintech?"
    "Penalties for unauthorized access to computer systems"
    """
    try:
        if not request.query or len(request.query.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="query must be at least 5 characters"
            )
        
        result = samvidhan_engine.search_law(request.query, request.domain)
        
        if result["status"] == "error":
            return SamvidhanResponse(
                answer=result["answer"],
                sources=result["sources"],
                domain=result["domain"],
                status=result["status"]
            )
        
        return SamvidhanResponse(
            answer=result["answer"],
            sources=result["sources"],
            domain=result["domain"],
            status=result["status"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# ===== CLAUSE.AI ENDPOINTS =====

@app.post("/draft", response_model=AgentResponse)
async def generate_clause(request: DraftRequest):
    """
    Clause.ai Draft Generation Endpoint
    
    Uses LangGraph to generate contract clauses based on user queries.
    """
    try:
        # Convert history format if needed, or pass directly if compatible with LangChain messages
        # Here we assume simple dicts, we might need to convert to HumanMessage/AIMessage objects
        # depending on how the graph uses them. For now, let's just pass them as a list of dicts 
        # or convert them if the nodes expect specific objects. 
        # The AgentState defines messages as List[Union[HumanMessage, AIMessage]].
        
        from langchain_core.messages import HumanMessage, AIMessage
        
        converted_messages = []
        for msg in request.history:
            if msg.get("role") == "user":
                converted_messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "assistant":
                converted_messages.append(AIMessage(content=msg.get("content", "")))

        # Initialize the state
        initial_state = {
            "query": request.query,
            "messages": converted_messages,
            "context": "",
            "reference_clause": "",
            "final_draft": "",
            "phase": "",
            "missing_info": [],
            "clarification_question": ""
        }
        
        # Run the LangGraph Agent
        result = app_graph.invoke(initial_state)
        
        phase = result.get("phase", "")
        
        # --- SCENARIO 1: Guardrail stopped (general question/greeting/injection) ---
        if phase == "stopped":
            return {
                "status": "general_response",
                "phase": "stopped",
                "message": result.get("final_draft", ""),
                "missing_info": [],
                "draft": None,
                "reference": None
            }
        
        # --- SCENARIO 2: Triage needs clarification ---
        if phase == "planning":
            return {
                "status": "needs_info",
                "phase": "planning",
                "message": result.get("clarification_question", "Please provide more details."),
                "missing_info": result.get("missing_info", []),
                "draft": None,
                "reference": None
            }
        
        # --- SCENARIO 3: Draft completed successfully ---
        if phase == "drafting" or result.get("final_draft"):
            return {
                "status": "success",
                "phase": "drafting",
                "message": "Draft generated successfully.",
                "missing_info": [],
                "draft": result.get("final_draft", ""),
                "reference": result.get("reference_clause", "")
            }
        
        # --- FALLBACK: Unknown state ---
        return {
            "status": "error",
            "phase": "unknown",
            "message": "Unable to process your request. Please try again.",
            "missing_info": [],
            "draft": None,
            "reference": None
        }
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if not PDF_DIRECTORY.exists():
    print(f"⚠️  WARNING: PDF directory not found: {PDF_DIRECTORY}")
    print(f"Creating directory...")
    PDF_DIRECTORY.mkdir(parents=True, exist_ok=True)
else:
    pdf_files = list(PDF_DIRECTORY.glob("*.pdf"))
    print(f"✅ PDF directory found: {PDF_DIRECTORY}")
    print(f"📁 Found {len(pdf_files)} PDF files:")
    for pdf in pdf_files:
        print(f"   - {pdf.name}")

@app.api_route("/pdfs/{filename}", methods=["GET", "HEAD"])
async def serve_pdf(filename: str):
    """
    Serve PDF files from the data directory
    Handles URL-encoded filenames (spaces, special chars)
    """
    try:
        # Decode URL-encoded filename
        from urllib.parse import unquote
        decoded_filename = unquote(filename)
        
        # Construct full file path
        file_path = PDF_DIRECTORY / decoded_filename
        
        print(f"📄 PDF Request: {decoded_filename}")
        print(f"   Path: {file_path}")
        print(f"   Exists: {file_path.exists()}")
        
        # Check if file exists
        if not file_path.exists():
            available = [f.name for f in PDF_DIRECTORY.glob("*.pdf")]
            print(f"❌ PDF not found. Available files: {available}")
            raise HTTPException(
                status_code=404,
                detail=f"PDF not found: {decoded_filename}"
            )
        
        # Security check - ensure file is within PDF directory
        if not file_path.resolve().is_relative_to(PDF_DIRECTORY.resolve()):
            print(f"🚫 Security: File outside allowed directory")
            raise HTTPException(
                status_code=403,
                detail="Access denied: file outside allowed directory"
            )
        
        # Return PDF with proper headers
        return FileResponse(
            path=str(file_path),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{decoded_filename}"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition",
                "Cache-Control": "public, max-age=3600"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error serving PDF: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error serving PDF: {str(e)}"
        )


@app.get("/pdfs")
async def list_pdfs():
    """
    List all available PDFs - useful for debugging
    """
    try:
        pdf_files = [
            {
                "name": f.name,
                "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
                "url": f"http://localhost:8000/pdfs/{f.name}"
            }
            for f in PDF_DIRECTORY.glob("*.pdf")
        ]
        
        return {
            "count": len(pdf_files),
            "directory": str(PDF_DIRECTORY),
            "files": pdf_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Optional: Test endpoint to verify PDF serving
@app.get("/test-pdf")
async def test_pdf_setup():
    """
    Test endpoint to verify PDF directory setup
    """
    return {
        "pdf_directory": str(PDF_DIRECTORY),
        "directory_exists": PDF_DIRECTORY.exists(),
        "pdf_count": len(list(PDF_DIRECTORY.glob("*.pdf"))),
        "sample_files": [f.name for f in list(PDF_DIRECTORY.glob("*.pdf"))[:5]],
        "message": "If pdf_count is 0, check your data folder location"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)