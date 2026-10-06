from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

# auto_error=False so we can return 401 with our envelope
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated — missing Bearer token")

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Try DB first
    try:
        user = db.get(User, user_id)
        if user:
            if not user.is_active:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
            return user
    except HTTPException:
        raise
    except Exception:
        pass  # fall through to in-memory fallback

    # In-memory fallback (dev without Postgres) — import lazily to avoid cycle
    try:
        from app.routers.auth import _memory_users_by_id  # type: ignore

        user = _memory_users_by_id.get(user_id)
        if user:
            # Reconstruct minimal User-like object from dict for compatibility
            # We stored full dict; rebuild a simple namespace
            # Instead, fetch from memory_users_by_id which stores dict with same keys
            # Return a lightweight object that has required attrs
            class _MemUser:
                pass

            m = _MemUser()
            for k, v in user.items():
                setattr(m, k, v)
            # Ensure expected attrs exist
            if not getattr(m, "is_active", True):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
            return m  # type: ignore[return-value]
    except ImportError:
        pass

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
