from rag_engine import rag_engine

queries = [
    "What is the punishment for theft?",
    "chori ki saza kya hai?",
    "चोरी की सजा क्या है?",
    "Explain the punishment for theft in Hindi"
]

print("Testing Language Detection and Response:")
for q in queries:
    is_hindi = rag_engine._is_hindi(q)
    print(f"\nQuery: '{q}'")
    print(f"Detected as Hindi? {is_hindi}")
    
    # We can also try to invoke the chain to see the actual prompt if we want, 
    # but for now let's just check the detection logic which drives the instruction.
