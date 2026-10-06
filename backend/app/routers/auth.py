import logging
import uuid
import urllib.parse
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.progress import UserProgress
from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.oauth import (
    get_provider_status,
    is_provider_configured,
    get_provider_config_issues,
    generate_oauth_state,
    validate_oauth_state,
    get_authorization_url,
    exchange_code_for_token,
    fetch_user_profile,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])

def _now() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------
# In-memory fallback when Postgres is unavailable (dev / evaluation)
# ------------------------------------------------------------------
_memory_users_by_email: dict[str, dict] = {}
_memory_users_by_id: dict[str, dict] = {}

# Demo user for evaluation — always available even after restart
# Email: demo@algomaster.com  Password: Demo@1234
_DEMO_EMAIL = "demo@algomaster.com"
_DEMO_PASSWORD = "Demo@1234"
_DEMO_USERNAME = "demo"
try:
    _demo_hashed = hash_password(_DEMO_PASSWORD)
    _demo_id = "00000000-0000-4000-a000-000000000001"
    _demo_user = {
        "id": _demo_id,
        "email": _DEMO_EMAIL,
        "username": _DEMO_USERNAME,
        "full_name": "Demo Student",
        "college": "AlgoMaster Demo",
        "bio": "Demo account for evaluation",
        "avatar_url": None,
        "hashed_password": _demo_hashed,
        "is_active": True,
        "created_at": _now().isoformat(),
        "updated_at": _now().isoformat(),
    }
    _memory_users_by_email[_DEMO_EMAIL] = _demo_user
    _memory_users_by_id[_demo_id] = _demo_user
    # Also add surya demo for backwards compat
    if "surya@college.edu" not in _memory_users_by_email:
        _memory_users_by_email["surya@college.edu"] = {
            "id": "00000000-0000-4000-a000-000000000002",
            "email": "surya@college.edu",
            "username": "surya",
            "full_name": "Surya",
            "college": "Indian Institute of Technology",
            "bio": "CS student passionate about algorithms",
            "avatar_url": None,
            "hashed_password": hash_password("surya123"),
            "is_active": True,
            "created_at": _now().isoformat(),
            "updated_at": _now().isoformat(),
        }
        _memory_users_by_id["00000000-0000-4000-a000-000000000002"] = _memory_users_by_email["surya@college.edu"]
except Exception as e:
    logger.warning("Demo user seed failed: %s", e)


def _fmt_dt(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        return val
    try:
        return val.isoformat()  # type: ignore
    except Exception:
        return str(val)


def _user_to_response(user) -> dict:
    # Works for both SQLAlchemy User, _MemUser, and in-memory dict
    if isinstance(user, dict):
        return {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "full_name": user["full_name"],
            "college": user.get("college"),
            "bio": user.get("bio"),
            "avatar_url": user.get("avatar_url"),
            "is_active": user.get("is_active", True),
            "created_at": _fmt_dt(user.get("created_at")),
            "updated_at": _fmt_dt(user.get("updated_at")),
        }
    return {
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", None),
        "username": getattr(user, "username", None),
        "full_name": getattr(user, "full_name", None),
        "college": getattr(user, "college", None),
        "bio": getattr(user, "bio", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "is_active": getattr(user, "is_active", True),
        "created_at": _fmt_dt(getattr(user, "created_at", None)),
        "updated_at": _fmt_dt(getattr(user, "updated_at", None)),
    }


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register a new user")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Try DB first
    try:
        existing = db.execute(select(User).where((User.email == payload.email) | (User.username == payload.username))).scalars().first()
        if existing:
            if existing.email == payload.email:
                raise HTTPException(status_code=400, detail="Email already registered")
            raise HTTPException(status_code=400, detail="Username already taken")

        user = User(
            id=str(uuid.uuid4()),
            email=payload.email,
            username=payload.username,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            college=payload.college,
        )
        db.add(user)
        # Create progress row
        progress = UserProgress(user_id=user.id)
        db.add(progress)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": user.id, "email": user.email})

        return {
            "success": True,
            "data": {
                "user": _user_to_response(user),
                "access_token": token,
                "token_type": "bearer",
                "expires_in": settings.jwt_expire_minutes * 60,
            },
            "message": "Registration successful",
        }
    except HTTPException:
        raise
    except Exception as exc:
        # If DB is unavailable, fall back to in-memory
        logger.warning("DB register failed, using memory fallback: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

        if payload.email in _memory_users_by_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        if any(u["username"] == payload.username for u in _memory_users_by_email.values()):
            raise HTTPException(status_code=400, detail="Username already taken")

        uid = str(uuid.uuid4())
        now_iso = _now().isoformat()
        mem_user = {
            "id": uid,
            "email": payload.email,
            "username": payload.username,
            "full_name": payload.full_name,
            "college": payload.college,
            "bio": None,
            "avatar_url": None,
            "hashed_password": hash_password(payload.password),
            "is_active": True,
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        _memory_users_by_email[payload.email] = mem_user
        _memory_users_by_id[uid] = mem_user

        token = create_access_token({"sub": uid, "email": payload.email})

        return {
            "success": True,
                "data": {
                    "user": _user_to_response(mem_user),
                    "access_token": token,
                    "token_type": "bearer",
                    "expires_in": settings.jwt_expire_minutes * 60,
                },
            "message": "Registration successful (in-memory)",
        }


@router.post("/login", summary="Login and obtain JWT")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # Try DB first
    try:
        user = db.execute(select(User).where(User.email == payload.email)).scalars().first()
        if user:
            if not verify_password(payload.password, user.hashed_password or ""):
                raise HTTPException(status_code=401, detail="Invalid email or password")
            if not user.is_active:
                raise HTTPException(status_code=403, detail="Account is deactivated")
            token = create_access_token({"sub": user.id, "email": user.email})
            return {
                "success": True,
                "data": {
                    "user": _user_to_response(user),
                    "access_token": token,
                    "token_type": "bearer",
                    "expires_in": settings.jwt_expire_minutes * 60,
                },
                "message": "Login successful",
            }
        # No DB user found — if DB is actually reachable, this is a 401
        # Check if DB is reachable by trying a simple query; if we got here without exception, DB is up
        raise HTTPException(status_code=401, detail="Invalid email or password")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("DB login query failed, trying memory fallback: %s", exc)

    # In-memory fallback
    mem_user = _memory_users_by_email.get(payload.email)
    if not mem_user or not verify_password(payload.password, mem_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not mem_user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token({"sub": mem_user["id"], "email": mem_user["email"]})
    return {
        "success": True,
        "data": {
            "user": _user_to_response(mem_user),
            "access_token": token,
            "token_type": "bearer",
            "expires_in": settings.jwt_expire_minutes * 60,
        },
        "message": "Login successful",
    }


@router.get("/me", summary="Get current authenticated user")
def me(current_user=Depends(get_current_user)):
    return {
        "success": True,
        "data": _user_to_response(current_user if not isinstance(current_user, dict) else current_user),
    }


def _resolve_callback_url(request: Request, provider: str) -> str:
    current_settings = get_settings()
    if current_settings.oauth_redirect_base_url and current_settings.oauth_redirect_base_url.strip():
        return f"{current_settings.oauth_redirect_base_url.strip().rstrip('/')}/{provider}/callback"
    base = str(request.base_url).rstrip("/")
    return f"{base}/api/auth/oauth/{provider}/callback"


@router.get("/oauth/status", summary="Get status of OAuth providers")
def oauth_status():
    return {
        "success": True,
        "data": get_provider_status(),
        "message": "OAuth provider status",
    }


def _provider_display_name(provider: str) -> str:
    p = provider.lower().strip()
    if p == "linkedin":
        return "LinkedIn"
    if p == "google":
        return "Google"
    return p.title()


@router.get("/oauth/{provider}/authorize", summary="Start OAuth authorization flow")
def oauth_authorize(
    provider: str,
    request: Request,
    redirect_to: str | None = None,
):
    provider_clean = provider.lower().strip()
    if provider_clean not in ("google", "linkedin"):
        raise HTTPException(status_code=400, detail=f"Unsupported OAuth provider: '{provider}'")

    current_settings = get_settings()
    target_path = "/signup" if redirect_to and "signup" in redirect_to else "/login"
    login_base = f"{current_settings.frontend_url.rstrip('/')}{target_path}"

    issues = get_provider_config_issues(provider_clean)
    if issues:
        error_msg = f"{_provider_display_name(provider_clean)} sign-in is not configured yet."
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote(error_msg)}&oauth_provider={provider_clean}",
            status_code=307,
        )

    callback_url = _resolve_callback_url(request, provider_clean)
    state = generate_oauth_state(provider_clean, redirect_to)
    try:
        auth_url = get_authorization_url(provider_clean, callback_url, state)
        return RedirectResponse(url=auth_url, status_code=307)
    except Exception as exc:
        logger.error("Failed to construct OAuth URL: %s", exc)
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote(f'Failed to initiate {provider_clean.title()} login: {str(exc)}')}&oauth_provider={provider_clean}",
            status_code=307,
        )


@router.get("/oauth/{provider}/callback", summary="OAuth provider callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    error_description: str | None = Query(None),
    db: Session = Depends(get_db),
):
    provider_clean = provider.lower().strip()
    current_settings = get_settings()

    target_path = "/login"
    state_payload = None
    if state:
        state_payload = validate_oauth_state(state, provider_clean)
        if state_payload and state_payload.get("redirect_to") and "signup" in state_payload.get("redirect_to"):
            target_path = "/signup"

    login_base = f"{current_settings.frontend_url.rstrip('/')}{target_path}"

    if error:
        desc = error_description or error or "Authentication was cancelled."
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote(desc)}&oauth_provider={provider_clean}",
            status_code=307,
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote('Missing authorization code or state token.')}&oauth_provider={provider_clean}",
            status_code=307,
        )

    if not state_payload:
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote('OAuth session expired or invalid state. Please try again.')}&oauth_provider={provider_clean}",
            status_code=307,
        )

    issues = get_provider_config_issues(provider_clean)
    if issues:
        error_msg = f"{_provider_display_name(provider_clean)} sign-in is not configured yet."
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote(error_msg)}&oauth_provider={provider_clean}",
            status_code=307,
        )




    callback_url = _resolve_callback_url(request, provider_clean)

    try:
        access_token = await exchange_code_for_token(provider_clean, code, callback_url)
        profile = await fetch_user_profile(provider_clean, access_token)
    except Exception as exc:
        logger.error("OAuth token exchange / profile fetch failed: %s", exc)
        return RedirectResponse(
            url=f"{login_base}?oauth_error={urllib.parse.quote(f'Could not verify credentials with {provider_clean.title()}: {str(exc)}')}",
            status_code=307,
        )

    email = profile["email"]
    name = profile.get("name") or email.split("@")[0]
    avatar_url = profile.get("avatar_url")

    # Locate or create user in DB (or memory fallback)
    user_obj = None
    try:
        user_obj = db.execute(select(User).where(User.email == email)).scalars().first()
        if user_obj:
            if not user_obj.is_active:
                return RedirectResponse(
                    url=f"{login_base}?oauth_error={urllib.parse.quote('Account is deactivated.')}",
                    status_code=307,
                )
            if avatar_url and not user_obj.avatar_url:
                user_obj.avatar_url = avatar_url
                db.commit()
                db.refresh(user_obj)
        else:
            base_username = email.split("@")[0].lower()
            base_username = "".join(c for c in base_username if c.isalnum() or c == "_")[:20] or "user"
            username = base_username
            counter = 1
            while db.execute(select(User).where(User.username == username)).scalars().first():
                username = f"{base_username}_{counter}"
                counter += 1

            user_obj = User(
                id=str(uuid.uuid4()),
                email=email,
                username=username,
                full_name=name,
                avatar_url=avatar_url,
                hashed_password=None,
            )
            db.add(user_obj)
            db.add(UserProgress(user_id=user_obj.id))
            db.commit()
            db.refresh(user_obj)
    except Exception as exc:
        logger.warning("DB lookup/creation failed during OAuth, falling back to memory: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

        # Memory fallback
        mem_user = _memory_users_by_email.get(email)
        if mem_user:
            if not mem_user.get("is_active", True):
                return RedirectResponse(
                    url=f"{login_base}?oauth_error={urllib.parse.quote('Account is deactivated.')}",
                    status_code=307,
                )
            if avatar_url and not mem_user.get("avatar_url"):
                mem_user["avatar_url"] = avatar_url
            user_obj = mem_user
        else:
            base_username = email.split("@")[0].lower()
            base_username = "".join(c for c in base_username if c.isalnum() or c == "_")[:20] or "user"
            username = base_username
            counter = 1
            while any(u.get("username") == username for u in _memory_users_by_email.values()):
                username = f"{base_username}_{counter}"
                counter += 1

            uid = str(uuid.uuid4())
            now_iso = _now().isoformat()
            mem_user = {
                "id": uid,
                "email": email,
                "username": username,
                "full_name": name,
                "college": None,
                "bio": None,
                "avatar_url": avatar_url,
                "hashed_password": None,
                "is_active": True,
                "created_at": now_iso,
                "updated_at": now_iso,
            }
            _memory_users_by_email[email] = mem_user
            _memory_users_by_id[uid] = mem_user
            user_obj = mem_user

    user_id = user_obj["id"] if isinstance(user_obj, dict) else user_obj.id
    user_email = user_obj["email"] if isinstance(user_obj, dict) else user_obj.email
    jwt_token = create_access_token({"sub": user_id, "email": user_email})

    return RedirectResponse(
        url=f"{login_base}?oauth_token={jwt_token}&provider={provider_clean}",
        status_code=307,
    )

