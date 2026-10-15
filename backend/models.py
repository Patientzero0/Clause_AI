from pydantic import BaseModel
from typing import List, Optional

class QueryRequest(BaseModel):
    query: str
    mode: str = "auto" # "auto", "compare", "search"
    filters: Optional[dict] = None # e.g., {"domain": "Corporate"}

class Source(BaseModel):
    file_name: str
    law_type: Optional[str] = None
    section: Optional[str] = None
    year: Optional[str] = None
    preview: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[Source]
    mode_used: str

class EvalRequest(BaseModel):
    # For testing, we send a small dataset to evaluate
    questions: List[str]
    ground_truths: List[str]

class SummarizeResponse(BaseModel):
    summary: str
    key_verdicts: List[str]
    acts_cited: List[str]