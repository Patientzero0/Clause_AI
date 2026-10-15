
import requests

# Try to download a specific file we know usually exists or check the list first
# We'll try to find one from the list or default to 'BNS Book.pdf'
filename = "BNS Book.pdf" 
url = f"http://localhost:8000/files/{filename}"

print(f"Testing download from: {url}")

try:
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        print("✅ Success! File found and stream started.")
        print(f"   Headers: {response.headers}")
        # Read a bit to be sure
        chunk = next(response.iter_content(chunk_size=1024))
        print(f"   First 1024 bytes received. Content starts with: {chunk[:20]}")
    else:
        print(f"❌ Failed. Status Code: {response.status_code}")
        print(f"   Response: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")
