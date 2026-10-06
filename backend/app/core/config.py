import os
from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent
_ENV_FILES = (
    str(_BACKEND_DIR / ".env"),
    str(_ROOT_DIR / ".env"),
    ".env",
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    app_name: str = "AlgoMaster API"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api"
    secret_key: str = "change-me-to-a-random-secret-key"

    # --- Auth / JWT ---
    jwt_secret_key: str = "change-me-to-a-random-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24h
    jwt_refresh_expire_minutes: int = 60 * 24 * 7  # 7 days

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- Database ---
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/algomaster"

    # --- CORS ---
    cors_origins: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:5174,"
        "https://forge-nine-lovat.vercel.app"
    )

    # --- AI / Gemini / Groq ---
    ai_provider: str = "gemini"  # mock | gemini
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None

    # --- OAuth / Social Login (Google & LinkedIn) ---
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    linkedin_client_id: Optional[str] = None
    linkedin_client_secret: Optional[str] = None
    frontend_url: str = "http://localhost:5173"
    oauth_redirect_base_url: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        if self.frontend_url:
            clean_fe = self.frontend_url.strip().rstrip("/")
            if clean_fe and clean_fe not in origins:
                origins.append(clean_fe)
        return origins

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in ("development", "dev", "local")

    @property
    def effective_jwt_secret(self) -> str:
        # Prefer jwt_secret_key, fall back to secret_key
        if self.jwt_secret_key and self.jwt_secret_key != "change-me-to-a-random-secret-key":
            return self.jwt_secret_key
        return self.secret_key

    @property
    def effective_gemini_api_key(self) -> Optional[str]:
        val = os.getenv("GEMINI_API_KEY") if os.getenv("GEMINI_API_KEY") is not None else self.gemini_api_key
        return val.strip() if val and val.strip() else None

    @property
    def effective_groq_api_key(self) -> Optional[str]:
        val = os.getenv("GROQ_API_KEY") if os.getenv("GROQ_API_KEY") is not None else self.groq_api_key
        return val.strip() if val and val.strip() else None

    @property
    def effective_google_client_id(self) -> Optional[str]:
        val = os.getenv("GOOGLE_CLIENT_ID") if os.getenv("GOOGLE_CLIENT_ID") is not None else self.google_client_id
        return val.strip() if val and val.strip() else None

    @property
    def effective_google_client_secret(self) -> Optional[str]:
        val = os.getenv("GOOGLE_CLIENT_SECRET") if os.getenv("GOOGLE_CLIENT_SECRET") is not None else self.google_client_secret
        return val.strip() if val and val.strip() else None

    @property
    def effective_linkedin_client_id(self) -> Optional[str]:
        val = os.getenv("LINKEDIN_CLIENT_ID") if os.getenv("LINKEDIN_CLIENT_ID") is not None else self.linkedin_client_id
        return val.strip() if val and val.strip() else None

    @property
    def effective_linkedin_client_secret(self) -> Optional[str]:
        val = os.getenv("LINKEDIN_CLIENT_SECRET") if os.getenv("LINKEDIN_CLIENT_SECRET") is not None else self.linkedin_client_secret
        return val.strip() if val and val.strip() else None

    @property
    def resolved_database_url(self) -> str:
        """Resolve relative SQLite paths to backend directory so it works reliably from any working directory."""
        if self.database_url.startswith("sqlite:///") and not self.database_url.startswith("sqlite:////") and ":memory:" not in self.database_url:
            path_part = self.database_url[len("sqlite:///"):]
            if not os.path.isabs(path_part):
                cleaned = path_part.lstrip("./\\")
                target = (_BACKEND_DIR / cleaned).resolve()
                return f"sqlite:///{target.as_posix()}"
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
