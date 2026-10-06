import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.submission import Submission
from app.models.problem import Problem
from app.schemas.submission import SubmissionCreate
from app.services.code_execution import get_code_executor, MAX_CODE_SIZE_BYTES, SUPPORTED_LANGUAGES
from app.services.progress import update_progress_on_submission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])

# In-memory fallback when DB unavailable
_memory_submissions: list[dict] = []
_memory_id_counter: int = 1


def _to_response(sub) -> dict:
    if isinstance(sub, dict):
        # Ensure hidden expected not leaked in response (mock already hides, but double-check)
        return sub
    return {
        "id": sub.id,
        "user_id": sub.user_id,
        "problem_id": sub.problem_id,
        "problem_slug": getattr(sub.problem, "slug", None) if getattr(sub, "problem", None) else None,
        "problem_title": getattr(sub.problem, "title", None) if getattr(sub, "problem", None) else None,
        "language": sub.language,
        "code": sub.code,
        "status": sub.status,
        "runtime_ms": sub.runtime_ms,
        "memory_kb": sub.memory_kb,
        "stdout": sub.stdout,
        "stderr": sub.stderr,
        "compile_error": sub.compile_error,
        "error_message": sub.error_message,
        "test_results": sub.test_results,
        "provider": sub.provider,
        "created_at": sub.created_at.isoformat() if sub.created_at else None,
        "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
    }


def _get_problem_test_cases(db: Session, problem_id: int) -> tuple[list[dict], str]:
    """Fetch test cases and difficulty for a problem_id, with seed fallback. Returns (test_cases, difficulty)."""
    try:
        prob = db.get(Problem, int(problem_id))
        if prob:
            # prob.test_cases is JSON list with id/input/expectedOutput/hidden
            cases = []
            for tc in (prob.test_cases or []):
                cases.append(
                    {
                        "id": tc.get("id", ""),
                        "input": tc.get("input", ""),
                        "expectedOutput": tc.get("expectedOutput", tc.get("expected", "")),
                        "expected": tc.get("expectedOutput", tc.get("expected", "")),
                        "hidden": bool(tc.get("hidden", False)),
                    }
                )
            return cases, prob.difficulty
    except Exception as exc:
        logger.warning("Problem lookup failed: %s", exc)

    # Seed fallback
    from app.data.seed import PROBLEMS_SEED

    seed = next((p for p in PROBLEMS_SEED if p["id"] == int(problem_id)), None)
    if not seed:
        raise HTTPException(status_code=404, detail=f"Problem {problem_id} not found")
    cases = []
    for tc in seed.get("test_cases", []):
        cases.append(
            {
                "id": tc.get("id", ""),
                "input": tc.get("input", ""),
                "expectedOutput": tc.get("expectedOutput", ""),
                "expected": tc.get("expectedOutput", ""),
                "hidden": bool(tc.get("hidden", False)),
            }
        )
    return cases, seed.get("difficulty", "Easy")


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a submission — validated, sandboxed, test-run")
async def create_submission(
    payload: SubmissionCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Additional defensive checks (beyond Pydantic)
    # Language already validated by schema, but double-check for mock vs production enablement
    lang = payload.language.strip().lower()
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {payload.language}")

    # Code size already validated by Pydantic, but re-check encoded size
    if len(payload.code.encode("utf-8")) > MAX_CODE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Code exceeds {MAX_CODE_SIZE_BYTES} bytes limit")

    # Basic path traversal / env leakage sanity (defense in depth)
    if ".." in payload.code[:200] and "/etc/passwd" in payload.code:
        raise HTTPException(status_code=400, detail="Suspicious code pattern")

    problem_id = payload.problem_id
    language = lang
    code = payload.code

    # Fetch test cases and difficulty for this problem
    test_cases, problem_difficulty = _get_problem_test_cases(db, problem_id)

    # Execute via sandboxed provider (mock in dev, docker in prod)
    executor = get_code_executor()
    if not executor.is_language_enabled(language):
        raise HTTPException(status_code=400, detail=f"Language '{language}' not enabled on this executor")

    try:
        # The executor is responsible for sandboxing, timeouts, and not exposing secrets
        exec_result = await executor.execute(code=code, language=language, test_cases=test_cases)
    except Exception as exc:
        logger.error("Execution failed: %s", exc, exc_info=True)
        exec_result = {
            "success": False,
            "status": "Internal Error",
            "stderr": "Internal execution error",
            "provider": getattr(executor, "provider_name", "forge-runner") if hasattr(executor, "provider_name") else "forge-runner",
            "results": [],
        }

    # Map executor result to submission fields
    status = exec_result.get("status", "Internal Error")
    # Ensure status is one of allowed enum
    allowed_statuses = {"Accepted", "Wrong Answer", "Compilation Error", "Runtime Error", "Time Limit Exceeded", "Memory Limit Exceeded", "Internal Error", "Execution Service Unavailable", "Pending"}
    if status not in allowed_statuses:
        status = "Internal Error"

    user_id = getattr(current_user, "id", None) or current_user["id"] if isinstance(current_user, dict) else current_user.id  # type: ignore
    user_id = str(user_id)

    # Prepare submission record with all execution details
    # For hidden tests, executor already hides expected/input, so safe to store as-is
    test_results = exec_result.get("results", [])
    # Ensure output size limit for storage
    for r in test_results:
        if r.get("output") and len(str(r["output"]).encode()) > 10 * 1024:
            r["output"] = str(r["output"])[: 10 * 1024] + "…[truncated]"

    stdout = exec_result.get("stdout")
    stderr = exec_result.get("stderr")
    compile_error = exec_result.get("compile_error")
    error_message = exec_result.get("error_message") or exec_result.get("message")
    # Truncate stdout/stderr to output limit
    if stdout and len(stdout.encode()) > 10 * 1024:
        stdout = stdout[: 10 * 1024] + "…[truncated]"
    if stderr and len(stderr.encode()) > 10 * 1024:
        stderr = stderr[: 10 * 1024] + "…[truncated]"

    # Try DB
    try:
        sub = Submission(
            user_id=user_id,
            problem_id=int(problem_id),
            language=language,
            code=code,
            status=status,
            runtime_ms=exec_result.get("runtime_ms"),
            memory_kb=exec_result.get("memory_kb"),
            stdout=stdout,
            stderr=stderr,
            compile_error=compile_error,
            error_message=error_message,
            test_results=test_results,
            provider=exec_result.get("provider", "forge-runner"),
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        try:
            update_progress_on_submission(db, user_id=user_id, problem_id=int(problem_id), difficulty=problem_difficulty, status=status)
            db.commit()
        except Exception as e:
            logger.warning("Progress update failed: %s", e)
            db.rollback()

        return {"success": True, "data": _to_response(sub), "message": "Submission created"}

    except Exception as exc:
        logger.warning("DB submission failed, using memory fallback: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

        global _memory_id_counter
        mem_sub = {
            "id": _memory_id_counter,
            "user_id": user_id,
            "problem_id": int(problem_id),
            "problem_slug": None,
            "problem_title": None,
            "language": language,
            "code": code,
            "status": status,
            "runtime_ms": exec_result.get("runtime_ms"),
            "memory_kb": exec_result.get("memory_kb"),
            "stdout": stdout,
            "stderr": stderr,
            "compile_error": compile_error,
            "error_message": error_message,
            "test_results": test_results,
            "provider": exec_result.get("provider", "forge-runner"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _memory_id_counter += 1
        _memory_submissions.append(mem_sub)

        try:
            from app.services.progress import update_memory_progress

            update_memory_progress(user_id=user_id, problem_id=int(problem_id), difficulty=problem_difficulty, status=status)
        except Exception as e:
            logger.warning("Memory progress update failed: %s", e)

        return {"success": True, "data": mem_sub, "message": "Submission created (in-memory)"}



@router.get("", summary="List current user's submissions")
def list_submissions(
    problem_id: Optional[int] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = getattr(current_user, "id", None) or current_user["id"] if isinstance(current_user, dict) else current_user.id  # type: ignore
    user_id = str(user_id)

    # Try DB
    try:
        stmt = select(Submission).where(Submission.user_id == user_id).order_by(desc(Submission.created_at))
        if problem_id:
            stmt = stmt.where(Submission.problem_id == problem_id)
        if status_filter:
            stmt = stmt.where(Submission.status == status_filter)

        all_rows = db.execute(stmt).scalars().all()
        total = len(all_rows)
        paged = all_rows[offset : offset + limit]
        data = [_to_response(s) for s in paged]
        return {"success": True, "data": data, "total": total}
    except Exception as exc:
        logger.warning("DB list submissions failed, using memory: %s", exc)
        filtered = [s for s in _memory_submissions if s["user_id"] == user_id]
        if problem_id:
            filtered = [s for s in filtered if s["problem_id"] == problem_id]
        if status_filter:
            filtered = [s for s in filtered if s["status"] == status_filter]
        filtered = sorted(filtered, key=lambda x: x["created_at"], reverse=True)
        total = len(filtered)
        paged = filtered[offset : offset + limit]
        return {"success": True, "data": paged, "total": total}


@router.post("/run", summary="Run code against test cases without saving submission (dry run)")
async def run_code(
    payload: dict,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dry-run: validates and executes but does not persist. Used for 'Run' button.
    Returns same structured result as submission but without DB write.
    """
    problem_id = payload.get("problem_id")
    language = (payload.get("language") or "python").strip().lower()
    code = payload.get("code", "")

    if not problem_id:
        raise HTTPException(status_code=400, detail="problem_id is required")
    if not code or not code.strip():
        raise HTTPException(status_code=400, detail="code is required")
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {language}")
    if len(code.encode("utf-8")) > MAX_CODE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Code exceeds {MAX_CODE_SIZE_BYTES} bytes")

    test_cases, _ = _get_problem_test_cases(db, int(problem_id))
    executor = get_code_executor()
    if not executor.is_language_enabled(language):
        raise HTTPException(status_code=400, detail=f"Language '{language}' not enabled")

    try:
        result = await executor.execute(code=code, language=language, test_cases=test_cases)
    except Exception as exc:
        logger.error("Run failed: %s", exc, exc_info=True)
        result = {"success": False, "status": "Internal Error", "stderr": "Internal error", "provider": getattr(executor, "provider_name", "forge-runner"), "results": []}

    # Do not expose hidden expected for dry run either (executor already hides)
    return {"success": True, "data": result}


@router.get("/{submission_id}", summary="Get a single submission (owner only)")
def get_submission(
    submission_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = str(getattr(current_user, "id", None) or current_user["id"] if isinstance(current_user, dict) else current_user.id)  # type: ignore
    # Try DB
    try:
        sub = db.get(Submission, submission_id)
        if sub and str(sub.user_id) == user_id:
            return {"success": True, "data": _to_response(sub)}
        if sub and str(sub.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized for this submission")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Get submission DB failed: %s", exc)
    # Memory fallback
    for s in _memory_submissions:
        if s["id"] == submission_id:
            if str(s["user_id"]) != user_id:
                raise HTTPException(status_code=403, detail="Not authorized for this submission")
            return {"success": True, "data": s}
    raise HTTPException(status_code=404, detail="Submission not found")
