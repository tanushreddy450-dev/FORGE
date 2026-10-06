import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.progress import UserProgress
from app.models.submission import Submission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])

# In-memory fallback — imported from services.progress for single source of truth
try:
    from app.services.progress import _memory_progress  # type: ignore
except ImportError:
    _memory_progress: dict = {}


@router.get("", summary="Get current user's progress")
def get_progress(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = getattr(current_user, "id", None) or current_user["id"] if isinstance(current_user, dict) else current_user.id  # type: ignore
    user_id = str(user_id)

    # Try DB
    try:
        prog = db.execute(select(UserProgress).where(UserProgress.user_id == user_id)).scalars().first()
        if prog:
            # Compute solved distinct problems from submissions (Accepted)
            accepted = db.execute(
                select(Submission.problem_id).where(Submission.user_id == user_id, Submission.status == "Accepted")
            ).scalars().all()
            distinct_solved = len(set(accepted))

            return {
                "success": True,
                "data": {
                    "id": prog.id,
                    "user_id": prog.user_id,
                    "total_solved": prog.total_solved,
                    "easy_solved": prog.easy_solved,
                    "medium_solved": prog.medium_solved,
                    "hard_solved": prog.hard_solved,
                    "streak": prog.streak,
                    "total_submissions": prog.total_submissions,
                    "topics_completed": prog.topics_completed,
                    "rank": prog.rank,
                    "distinct_solved": distinct_solved,
                    "updated_at": prog.updated_at.isoformat() if prog.updated_at else None,
                },
            }
        # No progress row yet → return defaults
        return {
            "success": True,
            "data": {
                "id": None,
                "user_id": user_id,
                "total_solved": 0,
                "easy_solved": 0,
                "medium_solved": 0,
                "hard_solved": 0,
                "streak": 0,
                "total_submissions": 0,
                "topics_completed": 0,
                "rank": "Beginner",
                "distinct_solved": 0,
                "updated_at": None,
            },
        }
    except Exception as exc:
        logger.warning("DB progress fetch failed, using memory: %s", exc)
        mem = _memory_progress.get(user_id)
        if mem:
            return {"success": True, "data": mem}
        return {
            "success": True,
            "data": {
                "id": None,
                "user_id": user_id,
                "total_solved": 0,
                "easy_solved": 0,
                "medium_solved": 0,
                "hard_solved": 0,
                "streak": 0,
                "total_submissions": 0,
                "topics_completed": 0,
                "rank": "Beginner",
                "distinct_solved": 0,
                "updated_at": None,
            },
        }
