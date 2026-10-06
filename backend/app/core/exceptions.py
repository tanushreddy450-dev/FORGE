from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.status_code,
                "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            },
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Make errors JSON serializable — Pydantic may put ValueError objects in ctx
    raw_errors = exc.errors()
    safe_errors = []
    for err in raw_errors:
        safe_err = dict(err)
        if "ctx" in safe_err and isinstance(safe_err["ctx"], dict):
            safe_ctx = {}
            for k, v in safe_err["ctx"].items():
                try:
                    # Try to json serialize, otherwise stringify
                    import json

                    json.dumps(v)
                    safe_ctx[k] = v
                except Exception:
                    safe_ctx[k] = str(v)
            safe_err["ctx"] = safe_ctx
        safe_errors.append(safe_err)

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": 422,
                "message": "Validation error",
                "details": safe_errors,
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": 500,
                "message": "Internal server error",
            },
        },
    )
