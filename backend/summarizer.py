import shutil
import os
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from ollama_model import create_chat_model

async def summarize_legal_doc(file: UploadFile):
    # 1. Save uploaded file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 2. Parse PDF
        loader = PyPDFLoader(temp_path)
        pages = loader.load()
        
        # Combine all text first
        raw_text = "\n".join([p.page_content for p in pages])
        
        # Keep the prompt within a manageable size for local models.
        limit_chars = 18000
        full_text = raw_text[:limit_chars]
        
        # 3. Summarize with LLM
        llm = create_chat_model()
        
        prompt = PromptTemplate.from_template(
            """
            Analyze the following legal document text:
            {text}
            
            Extract the following in JSON format:
            1. "summary": A concise 5-line summary of the case/document.
            2. "verdict": The final decision or key directive.
            3. "acts_cited": List of specific laws/acts mentioned (e.g., Section 302 IPC).
            """
        )
        
        chain = prompt | llm
        result = chain.invoke({"text": full_text})
        
        # Clean up
        os.remove(temp_path)
        return result.content
        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e