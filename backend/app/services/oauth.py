import logging
import uuid
from datetime import timedelta
from urllib.parse import urlencode
from typing import Optional, Dict, Any

import httpx
from app.core.config import get_settings
from app.core.security import create_access_token, decode_access_token

logger = logging.getLogger(__name__)
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_SCOPES = ["openid", "email", "profile"]

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_SCOPES = ["openid", "profile", "email"]


def get_provider_config_issues(provider: str) -> list[str]:
    """Return a list of missing configuration keys for the given provider."""
    p = provider.lower()
    issues: list[str] = []
    settings = get_settings()
    if p == "google":
        if not settings.effective_google_client_id:
            issues.append("GOOGLE_CLIENT_ID")
        if not settings.effective_google_client_secret:
            issues.append("GOOGLE_CLIENT_SECRET")
    elif p == "linkedin":
        if not settings.effective_linkedin_client_id:
            issues.append("LINKEDIN_CLIENT_ID")
        if not settings.effective_linkedin_client_secret:
            issues.append("LINKEDIN_CLIENT_SECRET")
    else:
        issues.append(f"Unsupported provider: {provider}")
    return issues


def is_provider_configured(provider: str) -> bool:
    """Check whether credentials for the given OAuth provider are configured."""
    return len(get_provider_config_issues(provider)) == 0


def get_provider_status() -> Dict[str, Any]:
    """Return public status of supported OAuth providers."""
    settings = get_settings()
    return {
        "google": {
            "configured": is_provider_configured("google"),
            "client_id_configured": bool(settings.effective_google_client_id),
            "missing_keys": get_provider_config_issues("google"),
        },
        "linkedin": {
            "configured": is_provider_configured("linkedin"),
            "client_id_configured": bool(settings.effective_linkedin_client_id),
            "missing_keys": get_provider_config_issues("linkedin"),
        },
    }


def generate_oauth_state(provider: str, redirect_to: Optional[str] = None) -> str:
    """Generate a tamper-proof signed state token for CSRF protection with 10-minute expiry."""
    payload = {
        "action": "oauth_state",
        "provider": provider.lower(),
        "redirect_to": redirect_to or "",
        "nonce": uuid.uuid4().hex,
    }
    return create_access_token(payload, expires_delta=timedelta(minutes=10))


def validate_oauth_state(state: str, expected_provider: str) -> Optional[Dict[str, Any]]:
    """Validate the incoming state token against tampering and expiration."""
    payload = decode_access_token(state)
    if not payload:
        return None
    if payload.get("action") != "oauth_state":
        return None
    if payload.get("provider") != expected_provider.lower():
        return None
    return payload


def get_authorization_url(provider: str, redirect_uri: str, state: str) -> str:
    """Build the OAuth authorization URL for the requested provider."""
    p = provider.lower()
    settings = get_settings()
    if p == "google":
        client_id = settings.effective_google_client_id
        if not client_id:
            raise ValueError("GOOGLE_CLIENT_ID is not configured.")
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    elif p == "linkedin":
        client_id = settings.effective_linkedin_client_id
        if not client_id:
            raise ValueError("LINKEDIN_CLIENT_ID is not configured.")
        params = {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": " ".join(LINKEDIN_SCOPES),
        }
        return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"

    raise ValueError(f"Unsupported OAuth provider: {provider}")


async def exchange_code_for_token(provider: str, code: str, redirect_uri: str) -> str:
    """Exchange authorization code with provider for an access token."""
    p = provider.lower()
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15.0) as client:
        if p == "google":
            client_id = settings.effective_google_client_id
            client_secret = settings.effective_google_client_secret
            if not client_id or not client_secret:
                raise ValueError("Google OAuth credentials are not configured.")
            payload = {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }
            resp = await client.post(GOOGLE_TOKEN_URL, data=payload)
            if resp.status_code != 200:
                logger.error("Google token exchange failed: status=%s body=%s", resp.status_code, resp.text)
                raise RuntimeError(f"Google token exchange failed: {resp.text}")
            data = resp.json()
            token = data.get("access_token")
            if not token:
                raise RuntimeError("No access_token returned by Google")
            return token

        elif p == "linkedin":
            client_id = settings.effective_linkedin_client_id
            client_secret = settings.effective_linkedin_client_secret
            if not client_id or not client_secret:
                raise ValueError("LinkedIn OAuth credentials are not configured.")
            payload = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            }
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            resp = await client.post(LINKEDIN_TOKEN_URL, data=payload, headers=headers)
            if resp.status_code != 200:
                logger.error("LinkedIn token exchange failed: status=%s body=%s", resp.status_code, resp.text)
                raise RuntimeError(f"LinkedIn token exchange failed: {resp.text}")
            data = resp.json()
            token = data.get("access_token")
            if not token:
                raise RuntimeError("No access_token returned by LinkedIn")
            return token

    raise ValueError(f"Unsupported OAuth provider: {provider}")



async def fetch_user_profile(provider: str, access_token: str) -> Dict[str, Any]:
    """Fetch and normalize user profile from provider userinfo endpoint."""
    p = provider.lower()
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        if p == "google":
            resp = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            if resp.status_code != 200:
                logger.error("Google userinfo fetch failed: status=%s body=%s", resp.status_code, resp.text)
                raise RuntimeError(f"Failed to fetch Google profile: {resp.text}")
            data = resp.json()
            email = data.get("email")
            if not email:
                raise RuntimeError("Google profile did not contain an email address")
            return {
                "provider": "google",
                "provider_user_id": data.get("sub"),
                "email": email.strip().lower(),
                "name": data.get("name") or data.get("given_name") or email.split("@")[0],
                "avatar_url": data.get("picture"),
                "email_verified": data.get("email_verified", True),
            }

        elif p == "linkedin":
            resp = await client.get(LINKEDIN_USERINFO_URL, headers=headers)
            if resp.status_code != 200:
                logger.error("LinkedIn userinfo fetch failed: status=%s body=%s", resp.status_code, resp.text)
                raise RuntimeError(f"Failed to fetch LinkedIn profile: {resp.text}")
            data = resp.json()
            email = data.get("email")
            if not email:
                raise RuntimeError("LinkedIn profile did not contain an email address")
            name = data.get("name")
            if not name:
                given = data.get("given_name", "")
                family = data.get("family_name", "")
                name = f"{given} {family}".strip() or email.split("@")[0]
            return {
                "provider": "linkedin",
                "provider_user_id": data.get("sub"),
                "email": email.strip().lower(),
                "name": name,
                "avatar_url": data.get("picture"),
                "email_verified": data.get("email_verified", True),
            }

    raise ValueError(f"Unsupported OAuth provider: {provider}")
