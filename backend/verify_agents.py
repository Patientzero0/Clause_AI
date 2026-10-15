import requests
import json

BASE_URL = "http://localhost:8000"

def test_domain_agent():
    print("\nTesting Domain Agent...")
    payload = {
        "query": "What are the rules for data privacy in fintech?",
        "mode": "domain" # Optional, but good for logging
    }
    try:
        response = requests.post(f"{BASE_URL}/agent/domain", json=payload)
        if response.status_code == 200:
            print("✅ Domain Agent Success!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Domain Agent Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

def test_legal_agent():
    print("\nTesting Legal Agent...")
    payload = {
        "query": "First-time offender, age 21, convicted for Shoplifting (BNS 303). Value of goods: Rs. 2000. No prior criminal record.",
        "mode": "legal"
    }
    try:
        response = requests.post(f"{BASE_URL}/agent/legal", json=payload)
        if response.status_code == 200:
            print("✅ Legal Agent Success!")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Legal Agent Failed: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_domain_agent()
    test_legal_agent()
