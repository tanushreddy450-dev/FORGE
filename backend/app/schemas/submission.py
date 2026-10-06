from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.code_execution import SUPPORTED_LANGUAGES, MAX_CODE_SIZE_BYTES


class SubmissionCreate(BaseModel):
    problem_id: int = Field(gt=0)
    language: str = Field(default="python", min_length=1, max_length=20)
    code: str = Field(min_length=1, max_length=MAX_CODE_SIZE_BYTES)

    @field_validator("language")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        lang = v.strip().lower()
        # Reject path traversal / shell injection patterns
        if ".." in lang or "/" in lang or "\\" in lang or " " in lang:
            raise ValueError("Invalid language")
        if lang not in SUPPORTED_LANGUAGES:
            raise ValueError(f"Unsupported language: {v}. Supported: {', '.join(sorted(SUPPORTED_LANGUAGES))}")
        return lang

    @field_validator("code")
    @classmethod
    def validate_code_size(cls, v: str) -> str:
        if len(v.encode("utf-8")) > MAX_CODE_SIZE_BYTES:
            raise ValueError(f"Code exceeds {MAX_CODE_SIZE_BYTES} bytes limit")
        return v


class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    problem_id: int
    language: str
    code: str
    status: str
    runtime_ms: int | None = None
    memory_kb: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    compile_error: str | None = None
    error_message: str | None = None
    test_results: list[dict] | None = None
    provider: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
