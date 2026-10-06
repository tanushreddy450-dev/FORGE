"""
Progress service — computes and updates user progress.

Handles both DB and in-memory fallback. Keeps the business logic
outside of routers so it can be reused (e.g., leaderboard, recommendations).
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# In-memory fallback stores
_memory_progress: dict[str, dict] = {}
_memory_solved: dict[str, set[int]] = {}


def _rank_for_solved(total: int) -> str:
    if total >= 100:
        return "Master"
    if total >= 50:
        return "Knight"
    if total >= 20:
        return "Warrior"
    if total >= 5:
        return "Apprentice"
    return "Beginner"


def update_memory_progress(user_id: str, problem_id: int, difficulty: str, status: str) -> None:
    prog = _memory_progress.get(user_id)
    if not prog:
        prog = {
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
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _memory_progress[user_id] = prog
        _memory_solved[user_id] = set()

    prog["total_submissions"] = prog.get("total_submissions", 0) + 1

    if status == "Accepted":
        solved = _memory_solved.setdefault(user_id, set())
        if problem_id not in solved:
            solved.add(problem_id)
            prog["total_solved"] = len(solved)
            prog["distinct_solved"] = len(solved)
            if difficulty == "Easy":
                prog["easy_solved"] = prog.get("easy_solved", 0) + 1
            elif difficulty == "Medium":
                prog["medium_solved"] = prog.get("medium_solved", 0) + 1
            elif difficulty == "Hard":
                prog["hard_solved"] = prog.get("hard_solved", 0) + 1
            prog["rank"] = _rank_for_solved(prog["total_solved"])
            # Simple streak: increment on each new solve
            prog["streak"] = prog.get("streak", 0) + 1

    prog["updated_at"] = datetime.now(timezone.utc).isoformat()


def update_progress_on_submission(db, user_id: str, problem_id: int, difficulty: str, status: str) -> None:
    """DB-backed progress update. Call inside the same transaction as submission creation."""
    from app.models.progress import UserProgress
    from app.models.submission import Submission
    from sqlalchemy import select, func

    prog = db.execute(select(UserProgress).where(UserProgress.user_id == user_id)).scalars().first()
    if not prog:
        prog = UserProgress(user_id=user_id)
        db.add(prog)
        db.flush()

    prog.total_submissions = (prog.total_submissions or 0) + 1

    if status == "Accepted":
        # Count how many Accepted submissions exist for this problem/user (including this one)
        count_for_problem = db.execute(
            select(func.count()).select_from(Submission).where(
                Submission.user_id == user_id,
                Submission.problem_id == problem_id,
                Submission.status == "Accepted",
            )
        ).scalar_one()
        is_first_solve = count_for_problem == 1
        if is_first_solve:
            prog.total_solved = (prog.total_solved or 0) + 1
            if difficulty == "Easy":
                prog.easy_solved = (prog.easy_solved or 0) + 1
            elif difficulty == "Medium":
                prog.medium_solved = (prog.medium_solved or 0) + 1
            elif difficulty == "Hard":
                prog.hard_solved = (prog.hard_solved or 0) + 1
            prog.streak = (prog.streak or 0) + 1
            prog.rank = _rank_for_solved(prog.total_solved)
            prog.updated_at = datetime.now(timezone.utc)
