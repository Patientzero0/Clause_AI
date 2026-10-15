import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from web_engine import web_engine

print("Running Web Search Validation...")
try:
    result = web_engine.simple_search("latest news india")
    print("\n--- Result ---")
    print(f"Answer: {result.get('answer')[:200]}...")
    print(f"Sources: {len(result.get('sources', []))}")
    if "Summarization unavailable" in result.get('answer', ''):
        print("\n[NOTE] LLM Summarization failed, fallback active (Expected if API key issues)")
    else:
        print("\n[SUCCESS] LLM Summarization worked")
except Exception as e:
    print(f"[ERROR] Test failed: {e}")
