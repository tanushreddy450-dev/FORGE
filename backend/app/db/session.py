import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Engine is created lazily; connection is only attempted on first use.
# This allows the API to run with seed data even when PostgreSQL is unavailable.
db_url = settings.resolved_database_url
connect_args = (
    {"check_same_thread": False}
    if "sqlite" in db_url
    else {"connect_timeout": 1} if "postgresql" in db_url else {}
)
engine_kwargs = {
    "connect_args": connect_args,
    "echo": settings.debug and False,  # set True to log SQL
}
if "sqlite" not in db_url:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
    })
else:
    engine_kwargs.update({
        "pool_pre_ping": True,
    })

engine = create_engine(
    db_url,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Return True if DB is reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.warning("DB connection check failed: %s", exc)
        return False
