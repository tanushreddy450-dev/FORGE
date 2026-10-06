from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.oauth import generate_oauth_state, validate_oauth_state

client = TestClient(app, follow_redirects=False)


def test_oauth_status_unconfigured():
    resp = client.get("/api/auth/oauth/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "google" in data["data"]
    assert "linkedin" in data["data"]
    assert data["data"]["google"]["configured"] is False
    assert data["data"]["linkedin"]["configured"] is False


def test_oauth_authorize_unconfigured_redirects_with_notice():
    import urllib.parse
    resp = client.get("/api/auth/oauth/google/authorize")
    assert resp.status_code == 307
    location = resp.headers["location"]
    assert "oauth_error=" in location
    assert "Google sign-in is not configured yet" in urllib.parse.unquote(location)


def test_oauth_authorize_partial_config_notice():
    import urllib.parse
    with patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "mock-client-id-123", "GOOGLE_CLIENT_SECRET": ""}):
        resp = client.get("/api/auth/oauth/google/authorize")
        assert resp.status_code == 307
        location = resp.headers["location"]
        assert "oauth_error=" in location
        assert "Google sign-in is not configured yet" in urllib.parse.unquote(location)


def test_linkedin_authorize_unconfigured_notice():
    import urllib.parse
    resp = client.get("/api/auth/oauth/linkedin/authorize")
    assert resp.status_code == 307
    location = resp.headers["location"]
    assert "oauth_error=" in location
    assert "LinkedIn sign-in is not configured yet" in urllib.parse.unquote(location)


def test_oauth_authorize_configured_redirects_to_google():
    with patch.dict("os.environ", {
        "GOOGLE_CLIENT_ID": "real-test-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "real-test-client-secret",
    }):
        resp = client.get("/api/auth/oauth/google/authorize")
        assert resp.status_code == 307
        location = resp.headers["location"]
        # Must redirect directly to Google, NOT to /login with oauth_error!
        assert "accounts.google.com" in location
        assert "client_id=real-test-client-id.apps.googleusercontent.com" in location
        assert "response_type=code" in location
        assert "oauth_error=" not in location


def test_oauth_authorize_invalid_provider():
    resp = client.get("/api/auth/oauth/facebook/authorize")
    assert resp.status_code == 400


def test_oauth_state_generation_and_validation():
    state = generate_oauth_state("google", redirect_to="/problems")
    assert isinstance(state, str)
    assert len(state) > 10

    # Valid validation
    payload = validate_oauth_state(state, "google")
    assert payload is not None
    assert payload["provider"] == "google"
    assert payload["redirect_to"] == "/problems"

    # Provider mismatch
    assert validate_oauth_state(state, "linkedin") is None

    # Corrupted state
    assert validate_oauth_state("invalid.token.here", "google") is None


def test_oauth_callback_missing_params():
    resp = client.get("/api/auth/oauth/google/callback")
    assert resp.status_code == 307
    assert "oauth_error=" in resp.headers["location"]


def test_oauth_callback_user_cancelled():
    resp = client.get("/api/auth/oauth/google/callback?error=access_denied&error_description=User+denied+access")
    assert resp.status_code == 307
    location = resp.headers["location"]
    assert "oauth_error=" in location
    import urllib.parse
    assert "User denied access" in urllib.parse.unquote(location)


@patch.dict("os.environ", {"GOOGLE_CLIENT_ID": "mock-client-id", "GOOGLE_CLIENT_SECRET": "mock-client-secret"})
@patch("app.routers.auth.exchange_code_for_token", new_callable=AsyncMock)
@patch("app.routers.auth.fetch_user_profile", new_callable=AsyncMock)
def test_oauth_successful_flow(mock_profile, mock_exchange):
    mock_exchange.return_value = "fake_access_token_123"
    mock_profile.return_value = {
        "provider": "google",
        "provider_user_id": "google_123456",
        "email": "sarah.connor@example.com",
        "name": "Sarah Connor",
        "avatar_url": "https://example.com/avatar.jpg",
        "email_verified": True,
    }

    state = generate_oauth_state("google")
    resp = client.get(f"/api/auth/oauth/google/callback?code=mock_code&state={state}")
    assert resp.status_code == 307
    location = resp.headers["location"]
    assert "oauth_token=" in location
    assert "provider=google" in location

    # Extract token from redirect URL
    import urllib.parse
    parsed = urllib.parse.urlparse(location)
    query_params = urllib.parse.parse_qs(parsed.query)
    token = query_params["oauth_token"][0]

    # Verify token can access /api/auth/me
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    user_data = me_resp.json()["data"]
    assert user_data["email"] == "sarah.connor@example.com"
    assert user_data["full_name"] == "Sarah Connor"


def test_existing_email_password_login_still_works():
    # Existing demo user login must remain intact
    resp = client.post("/api/auth/login", json={"email": "demo@algomaster.com", "password": "Demo@1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
