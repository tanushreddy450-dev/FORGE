import os
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
url = "https://api.groq.com/openai/v1/audio/speech"

payload = {
    "model": "canopylabs/orpheus-v1-english",
    "input": "Hello, welcome to Forge DSA.",
    "voice": "autumn",
    "response_format": "wav"
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as resp:
        content = resp.read()
        print(f"Success! Status: {resp.status}, Content Length: {len(content)}, Content Type: {resp.headers.get('Content-Type')}")
except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8")
    print(f"HTTPError {e.code}: {err_body}")
except Exception as e:
    print(f"Error: {e}")
