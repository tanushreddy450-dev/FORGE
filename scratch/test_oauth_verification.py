import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import os
import urllib.parse
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, follow_redirects=False)

print("--- 1. Testing Unconfigured Providers ---")
resp_g = client.get("/api/auth/oauth/google/authorize")
assert resp_g.status_code == 307
loc_g = urllib.parse.unquote(resp_g.headers["location"])
print("Google unconfigured location:", loc_g)
assert "Google sign-in is not configured yet." in loc_g

resp_li = client.get("/api/auth/oauth/linkedin/authorize")
assert resp_li.status_code == 307
loc_li = urllib.parse.unquote(resp_li.headers["location"])
print("LinkedIn unconfigured location:", loc_li)
assert "LinkedIn sign-in is not configured yet." in loc_li

print("\n--- 2. Testing Configured Google ---")
with patch.dict(os.environ, {
    "GOOGLE_CLIENT_ID": "mock-google-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "mock-google-secret"
}):
    resp_g_conf = client.get("/api/auth/oauth/google/authorize")
    assert resp_g_conf.status_code == 307
    loc_g_conf = resp_g_conf.headers["location"]
    print("Google configured redirect:", loc_g_conf[:70] + "...")
    assert "accounts.google.com" in loc_g_conf
    assert "client_id=mock-google-id.apps.googleusercontent.com" in loc_g_conf
    assert "oauth_error=" not in loc_g_conf

print("\n--- 3. Testing Configured LinkedIn ---")
with patch.dict(os.environ, {
    "LINKEDIN_CLIENT_ID": "mock-linkedin-id",
    "LINKEDIN_CLIENT_SECRET": "mock-linkedin-secret"
}):
    resp_li_conf = client.get("/api/auth/oauth/linkedin/authorize")
    assert resp_li_conf.status_code == 307
    loc_li_conf = resp_li_conf.headers["location"]
    print("LinkedIn configured redirect:", loc_li_conf[:70] + "...")
    assert "linkedin.com/oauth/v2/authorization" in loc_li_conf
    assert "client_id=mock-linkedin-id" in loc_li_conf
    assert "oauth_error=" not in loc_li_conf

print("\n--- 4. Testing Email/Password Auth Preservation ---")
resp_demo = client.post("/api/auth/login", json={"email": "demo@algomaster.com", "password": "Demo@1234"})
assert resp_demo.status_code == 200
assert resp_demo.json()["success"] is True
token = resp_demo.json()["data"]["access_token"]
print("Email/Password Demo Login: SUCCESS (token issued)")

resp_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
assert resp_me.status_code == 200
assert resp_me.json()["data"]["username"] == "demo"
print("Protected route /api/auth/me: SUCCESS (User:", resp_me.json()["data"]["email"], ")")

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
