import asyncio
import os
from langchain_core.prompts import PromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from ollama_model import create_chat_model

async def test_summarizer():
    print("Testing Summarizer...")

    try:
        # Test 1: LLM
        llm = create_chat_model()
        print("Ollama model configured.")
        
        # Test 2: PDF Loader
        print("Testing PDF Loader...")
        # Create a dummy PDF file
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt="This is a test legal document.", ln=1, align="C")
        pdf.output("test_doc.pdf")
        
        loader = PyPDFLoader("test_doc.pdf")
        pages = loader.load()
        print(f"PDF Loaded. Pages: {len(pages)}")
        print(f"Content: {pages[0].page_content}")
        
        # Test 3: Full Chain
        prompt = PromptTemplate.from_template("Summarize this: {text}")
        chain = prompt | llm
        print("Invoking chain with PDF content...")
        result = chain.invoke({"text": pages[0].page_content})
        print(f"Result: {result.content}")
        
        # Cleanup
        os.remove("test_doc.pdf")
        
    except Exception as e:
        print(f"ERROR during execution: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_summarizer())
