from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_cors_production_vercel_options_preflight():
    origin = "https://forge-nine-lovat.vercel.app"
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    resp = client.options("/api/auth/oauth/status", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_production_vercel_get_request():
    origin = "https://forge-nine-lovat.vercel.app"
    resp = client.get("/api/auth/oauth/status", headers={"Origin": origin})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_preview_vercel_domain():
    origin = "https://forge-git-feature-123.vercel.app"
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
    }
    resp = client.options("/api/health", headers=headers)
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_localhost_allowed():
    origin = "http://localhost:5173"
    resp = client.get("/api/health", headers={"Origin": origin})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_disallowed_origin():
    origin = "https://unauthorized-attacker.com"
    resp = client.options("/api/health", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    assert resp.status_code == 400
    assert "access-control-allow-origin" not in resp.headers
