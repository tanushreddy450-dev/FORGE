from fastapi import APIRouter

from app.core.config import get_settings
from app.db.session import check_db_connection

router = APIRouter(tags=["health"])
settings = get_settings()


@router.get("/health")
def health_check():
    """
    Health check — always returns 200 so load balancers / uptime monitors pass.
    Includes DB connectivity status without failing the request when DB is down.
    """
    db_ok = check_db_connection()
    return {
        "success": True,
        "data": {
            "status": "ok",
            "version": "0.1.0",
            "environment": settings.app_env,
            "database": "connected" if db_ok else "disconnected (using seed data)",
        },
        "message": "FORGE API is running",
    }


@router.get("/health/db")
def db_health():
    """Dedicated DB health probe."""
    db_ok = check_db_connection()
    return {
        "success": db_ok,
        "data": {"database": "connected" if db_ok else "disconnected"},
        "message": "Database is reachable" if db_ok else "Database is unreachable — check DATABASE_URL",
    }
