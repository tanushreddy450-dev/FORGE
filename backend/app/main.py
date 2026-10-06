import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.exceptions import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.topics import router as topics_router
from app.routers.problems import router as problems_router
from app.routers.submissions import router as submissions_router
from app.routers.progress import router as progress_router
from app.routers.leaderboard import router as leaderboard_router
from app.routers.recommendations import router as recommendations_router
from app.routers.ai import router as ai_router
from app.routers.insights import router as insights_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    logger.info("Starting %s (env=%s)", settings.app_name, settings.app_env)

    # Attempt to create tables if DB is reachable. Never crash startup if DB is down.
    try:
        from app.db.base import Base, _import_models
        from app.db.session import engine

        _import_models()
        # Use sync create_all — safe even if tables already exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
        # Seed demo user in DB if available (so Demo@1234 works after restart)
        try:
            from sqlalchemy import select
            from app.db.session import SessionLocal
            from app.models.user import User
            from app.models.progress import UserProgress
            from app.models.topic import DsaTopic
            from app.models.problem import Problem
            from app.core.security import hash_password
            from app.data.seed import TOPICS_SEED, PROBLEMS_SEED

            db = SessionLocal()
            try:
                demo_email = "demo@algomaster.com"
                existing = db.execute(select(User).where(User.email == demo_email)).scalars().first()
                if not existing:
                    demo_user = User(
                        id="00000000-0000-4000-a000-000000000001",
                        email=demo_email,
                        username="demo",
                        full_name="Demo Student",
                        hashed_password=hash_password("Demo@1234"),
                        college="AlgoMaster Demo",
                    )
                    db.add(demo_user)
                    db.add(UserProgress(user_id=demo_user.id))
                    db.commit()
                    logger.info("Demo user seeded in DB")

                # Seed topics
                if db.execute(select(DsaTopic).limit(1)).scalars().first() is None:
                    for t_data in TOPICS_SEED:
                        t = DsaTopic(
                            id=t_data["id"],
                            name=t_data["name"],
                            slug=t_data["slug"],
                            description=t_data["description"],
                            icon=t_data["icon"],
                            difficulty=t_data["difficulty"],
                            category=t_data["category"],
                            display_order=t_data["display_order"],
                            is_published=t_data["is_published"],
                            subtopics=t_data["subtopics"],
                        )
                        db.add(t)
                    db.commit()
                    logger.info("Topics seeded in DB")

                # Seed problems
                if db.execute(select(Problem).limit(1)).scalars().first() is None:
                    for p_data in PROBLEMS_SEED:
                        p = Problem(
                            id=p_data["id"],
                            title=p_data["title"],
                            slug=p_data["slug"],
                            difficulty=p_data["difficulty"],
                            topic_id=p_data["topic_id"],
                            description=p_data["description"],
                            examples=p_data["examples"],
                            constraints=p_data["constraints"],
                            starter_code=p_data["starter_code"],
                            test_cases=p_data["test_cases"],
                            tags=p_data["tags"],
                            acceptance=p_data["acceptance"],
                            is_published=p_data["is_published"],
                        )
                        db.add(p)
                    db.commit()
                    logger.info("Problems seeded in DB")
            finally:
                db.close()
        except Exception as e:
            logger.warning("DB seed skipped: %s", e)
    except Exception as exc:
        logger.warning("Skipping DB table creation (DB unavailable): %s", exc)

    yield

    # --- shutdown ---
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="Backend API for FORGE — DSA learning platform by Surya, Abhinaya & team.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ------------------------------------------------------------------
# Middleware: CORS — allow frontend dev server
# ------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Exception handlers
# ------------------------------------------------------------------
app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
app.add_exception_handler(Exception, generic_exception_handler)

# ------------------------------------------------------------------
# Routers — all under /api prefix
# ------------------------------------------------------------------
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(topics_router, prefix=settings.api_prefix)
app.include_router(problems_router, prefix=settings.api_prefix)
app.include_router(submissions_router, prefix=settings.api_prefix)
app.include_router(progress_router, prefix=settings.api_prefix)
app.include_router(leaderboard_router, prefix=settings.api_prefix)
app.include_router(recommendations_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)
app.include_router(insights_router, prefix=settings.api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return {
        "success": True,
        "data": {
            "name": settings.app_name,
            "version": "0.1.0",
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        },
        "message": "FORGE API — see /docs for interactive documentation",
    }
