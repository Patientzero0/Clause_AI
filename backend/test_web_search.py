import requests
import json

def test_web_search():
    url = "http://localhost:8000/search/web"
    payload = {"query": "latest supreme court judgment on bail"}
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        print("\n--- Web Search Response ---")
        print(f"Answer: {data.get('answer')[:100]}...")
        print(f"Number of Sources: {len(data.get('sources', []))}")
        
        for i, source in enumerate(data.get('sources', [])[:2]):
            print(f"\nSource {i+1}:")
            print(f"  Title: {source.get('title')}")
            print(f"  URL: {source.get('url')}")
            print(f"  Content: {source.get('content')[:50]}...")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_web_search()
