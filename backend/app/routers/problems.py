import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.problem import Problem
from app.data.seed import PROBLEMS_SEED, to_problem_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/problems", tags=["problems"])


def _solved_ids_for_user(db, user) -> set[int]:
    if not user:
        return set()
    user_id = str(getattr(user, "id", None) or (user.get("id") if isinstance(user, dict) else None) or "")  # type: ignore
    if not user_id:
        return set()
    try:
        from app.models.submission import Submission
        from sqlalchemy import select as sel
        rows = db.execute(sel(Submission.problem_id).where(Submission.user_id == user_id, Submission.status == "Accepted")).scalars().all()
        return set(int(x) for x in rows)
    except Exception:
        try:
            from app.services.progress import _memory_solved
            return _memory_solved.get(user_id, set()).copy()  # type: ignore
        except Exception:
            return set()


def _seed_problems_filtered(
    difficulty: str | None = None,
    topic_id: str | None = None,
    search: str | None = None,
    tag: str | None = None,
) -> list[dict]:
    items = PROBLEMS_SEED
    if difficulty and difficulty.lower() != "all":
        items = [p for p in items if p["difficulty"].lower() == difficulty.lower()]
    if topic_id and topic_id.lower() != "all":
        items = [p for p in items if str(p["topic_id"]) == str(topic_id) or p["topic_name"].lower() == topic_id.lower()]
    if search:
        q = search.lower()
        items = [p for p in items if q in p["title"].lower() or q in p["description"].lower()]
    if tag:
        q = tag.lower()
        items = [p for p in items if any(q in t.lower() for t in p["tags"])]
    return [to_problem_response(p) for p in items]


@router.get("", summary="List all problems")
def list_problems(
    difficulty: str | None = Query(default=None, description="Filter by difficulty: Easy | Medium | Hard"),
    topic_id: str | None = Query(default=None, description="Filter by topic id or topic name"),
    search: str | None = Query(default=None, description="Search by title or description"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=100, ge=1, le=200, description="Max results to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Returns problems with optional filtering. Tries database first;
    falls back to seed data when PostgreSQL is unavailable.
    """
    try:
        stmt = select(Problem).order_by(Problem.id)

        if difficulty and difficulty.lower() != "all":
            stmt = stmt.where(Problem.difficulty == difficulty.capitalize())
        if topic_id and topic_id.lower() != "all":
            # topic_id may be numeric or slug-like — try numeric first
            if topic_id.isdigit():
                stmt = stmt.where(Problem.topic_id == int(topic_id))
            else:
                # For slug-based filter we would need a join; keep simple
                # and filter after fetch
                pass
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(Problem.title.ilike(pattern) | Problem.description.ilike(pattern))
        if tag:
            # JSON containment — simple LIKE on tags serialization for portability
            pattern = f"%{tag}%"
            stmt = stmt.where(Problem.tags.astext.ilike(pattern) if hasattr(Problem.tags, "astext") else Problem.title.ilike(pattern))

        # Apply pagination at DB level
        stmt_paginated = stmt.limit(limit).offset(offset)
        rows = db.execute(stmt_paginated).scalars().all()

        # Count total (without pagination) — only if DB has data
        total_stmt = select(Problem)
        if difficulty and difficulty.lower() != "all":
            total_stmt = total_stmt.where(Problem.difficulty == difficulty.capitalize())
        total_rows = db.execute(total_stmt).scalars().all()

        solved_ids = _solved_ids_for_user(db, current_user)
        if rows or total_rows:
            # DB has data
            data = []
            for p in rows:
                data.append(
                    {
                        "id": p.id,
                        "title": p.title,
                        "slug": p.slug,
                        "difficulty": p.difficulty,
                        "topic_id": p.topic_id,
                        "topic_name": p.topic.name if p.topic else None,
                        "topicId": str(p.topic_id),
                        "topicName": p.topic.name if p.topic else None,
                        "description": p.description,
                        "examples": p.examples or [],
                        "constraints": p.constraints or [],
                        "starter_code": p.starter_code,
                        "starterCode": p.starter_code,
                        "test_cases": p.test_cases or [],
                        "testCases": p.test_cases or [],
                        "tags": p.tags or [],
                        "acceptance": p.acceptance,
                        "is_published": p.is_published,
                        "solved": p.id in solved_ids,
                        "created_at": p.created_at.isoformat() if p.created_at else None,
                    }
                )

            # If topic_id was a slug and we couldn't filter in SQL, filter in Python
            if topic_id and not topic_id.isdigit() and topic_id.lower() != "all":
                data = [d for d in data if d.get("topic_name") and d["topic_name"].lower() == topic_id.lower()]

            return {"success": True, "data": data, "total": len(total_rows) if total_rows else len(data)}

        # DB empty — fallback
        data = _seed_problems_filtered(difficulty=difficulty, topic_id=topic_id, search=search, tag=tag)
        # Enrich with per-user solved
        for item in data:
            item["solved"] = int(item["id"]) in solved_ids if isinstance(item.get("id"), int) else item.get("id") in {str(x) for x in solved_ids}
        paginated = data[offset : offset + limit]
        return {"success": True, "data": paginated, "total": len(data)}

    except Exception as exc:
        logger.warning("DB query for problems failed, falling back to seed data: %s", exc)
        data = _seed_problems_filtered(difficulty=difficulty, topic_id=topic_id, search=search, tag=tag)
        try:
            solved_ids = _solved_ids_for_user(db, current_user)
            for item in data:
                item["solved"] = int(item["id"]) in solved_ids
        except Exception:
            pass
        paginated = data[offset : offset + limit]
        return {"success": True, "data": paginated, "total": len(data)}


@router.get("/{problem_id}", summary="Get a single problem by ID or slug")
def get_problem(
    problem_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    `problem_id` may be numeric ID (e.g. `1`) or slug (e.g. `two-sum`).
    """
    # --- Try DB first ---
    try:
        problem: Problem | None = None
        if problem_id.isdigit():
            problem = db.get(Problem, int(problem_id))
        if problem is None:
            stmt = select(Problem).where(Problem.slug == problem_id)
            problem = db.execute(stmt).scalars().first()

        if problem is not None:
            solved_ids = _solved_ids_for_user(db, current_user)
            return {
                "success": True,
                "data": {
                    "id": problem.id,
                    "title": problem.title,
                    "slug": problem.slug,
                    "difficulty": problem.difficulty,
                    "topic_id": problem.topic_id,
                    "topic_name": problem.topic.name if problem.topic else None,
                    "topicId": str(problem.topic_id),
                    "topicName": problem.topic.name if problem.topic else None,
                    "description": problem.description,
                    "examples": problem.examples or [],
                    "constraints": problem.constraints or [],
                    "starter_code": problem.starter_code,
                    "starterCode": problem.starter_code,
                    "test_cases": problem.test_cases or [],
                    "testCases": problem.test_cases or [],
                    "tags": problem.tags or [],
                    "acceptance": problem.acceptance,
                    "is_published": problem.is_published,
                    "solved": problem.id in solved_ids,
                    "created_at": problem.created_at.isoformat() if problem.created_at else None,
                },
            }

        # DB has data but not this problem → 404 without seed fallback if DB non-empty
        if db.execute(select(Problem).limit(1)).scalars().first() is not None:
            raise HTTPException(status_code=404, detail=f"Problem '{problem_id}' not found")

    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("DB query for problem %s failed: %s", problem_id, exc)

    # --- Fallback to seed ---
    solved_ids = _solved_ids_for_user(db, current_user)
    for raw in PROBLEMS_SEED:
        if str(raw["id"]) == problem_id or raw["slug"] == problem_id:
            resp = to_problem_response(raw)
            resp["solved"] = raw["id"] in solved_ids
            return {"success": True, "data": resp}

    raise HTTPException(status_code=404, detail=f"Problem '{problem_id}' not found")
