import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.topic import DsaTopic
from app.data.seed import TOPICS_SEED, to_topic_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/topics", tags=["topics"])


def _seed_topics_filtered(
    category: str | None = None,
    search: str | None = None,
) -> list[dict]:
    items = TOPICS_SEED
    if category and category.lower() != "all":
        items = [t for t in items if t["category"].lower() == category.lower()]
    if search:
        q = search.lower()
        items = [t for t in items if q in t["name"].lower() or q in t["description"].lower()]
    return [to_topic_response(t) for t in items]


def _topic_problem_count(topic_id: int) -> int:
    from app.data.seed import PROBLEMS_SEED
    # Count problems for this topic from seed (used for display)
    return len([p for p in PROBLEMS_SEED if p["topic_id"] == topic_id])


def _user_completed_for_topic(db: Session, user, topic_id: int) -> int:
    if not user:
        return 0
    user_id = str(getattr(user, "id", None) or getattr(user, "id", None) if isinstance(user, dict) else getattr(user, "id", None))  # type: ignore
    if not user_id:
        return 0
    try:
        from app.models.submission import Submission
        from sqlalchemy import select as sel
        # Get distinct solved problem_ids for this user and topic
        # Need to join problem to get topic_id
        from app.models.problem import Problem
        stmt = select(Submission.problem_id).where(Submission.user_id == user_id, Submission.status == "Accepted")
        solved_ids = set(db.execute(stmt).scalars().all())
        # Filter to this topic
        count = 0
        for pid in solved_ids:
            prob = db.get(Problem, pid)
            if prob and prob.topic_id == topic_id:
                count += 1
            else:
                # Seed fallback: check seed
                from app.data.seed import PROBLEMS_SEED
                for p in PROBLEMS_SEED:
                    if p["id"] == pid and p["topic_id"] == topic_id:
                        count += 1
                        break
        return count
    except Exception:
        # In-memory fallback
        try:
            from app.services.progress import _memory_solved
            solved = _memory_solved.get(str(user_id), set())
            # Count how many solved are in this topic
            from app.data.seed import PROBLEMS_SEED
            return len([pid for pid in solved if any(p["id"] == pid and p["topic_id"] == topic_id for p in PROBLEMS_SEED)])
        except Exception:
            return 0


@router.get("", summary="List all DSA topics")
def list_topics(
    category: str | None = Query(default=None, description="Filter by category: Data Structures | Algorithms"),
    search: str | None = Query(default=None, description="Search by name or description"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    Returns all DSA topics. Tries database first; falls back to seed data
    when PostgreSQL is unavailable (development without DB).
    For authenticated users, completed_problems is per-user.
    """
    try:
        stmt = select(DsaTopic).order_by(DsaTopic.display_order)
        if category and category.lower() != "all":
            stmt = stmt.where(DsaTopic.category == category)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(DsaTopic.name.ilike(pattern) | DsaTopic.description.ilike(pattern))

        rows = db.execute(stmt).scalars().all()

        # If DB is empty (fresh install without seed), fall back to seed data
        if not rows:
            data = _seed_topics_filtered(category=category, search=search)
            # Enrich with per-user completed if authenticated
            if current_user:
                for item in data:
                    item["completed_problems"] = _user_completed_for_topic(db, current_user, item["id"])
                    item["problem_count"] = _topic_problem_count(item["id"])
            else:
                for item in data:
                    item["completed_problems"] = 0
                    item["problem_count"] = _topic_problem_count(item["id"])
            return {"success": True, "data": data, "total": len(data)}

        # Convert ORM objects to response dicts with per-user progress
        data = []
        for t in rows:
            pc = _topic_problem_count(t.id)
            # Use DB count if available (count problems in DB for this topic)
            try:
                from app.models.problem import Problem
                db_count = db.execute(select(Problem).where(Problem.topic_id == t.id)).scalars().all()
                if db_count:
                    pc = len(db_count)
            except Exception:
                pass
            completed = _user_completed_for_topic(db, current_user, t.id) if current_user else 0
            data.append(
                {
                    "id": t.id,
                    "name": t.name,
                    "slug": t.slug,
                    "description": t.description,
                    "icon": t.icon,
                    "difficulty": t.difficulty,
                    "category": t.category,
                    "subtopics": t.subtopics or [],
                    "problem_count": pc,
                    "completed_problems": completed,
                    "display_order": t.display_order,
                    "is_published": t.is_published,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                }
            )
        return {"success": True, "data": data, "total": len(data)}

    except Exception as exc:
        logger.warning("DB query for topics failed, falling back to seed data: %s", exc)
        data = _seed_topics_filtered(category=category, search=search)
        if current_user:
            for item in data:
                item["completed_problems"] = _user_completed_for_topic(db, current_user, item["id"])
                item["problem_count"] = _topic_problem_count(item["id"])
        else:
            for item in data:
                item["completed_problems"] = 0
                item["problem_count"] = _topic_problem_count(item["id"])
        return {"success": True, "data": data, "total": len(data)}


@router.get("/{topic_id}", summary="Get a single topic by ID or slug")
def get_topic(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    """
    `topic_id` may be numeric ID (e.g. `1`) or slug (e.g. `arrays`).
    """
    # --- Try DB first ---
    try:
        topic: DsaTopic | None = None

        if topic_id.isdigit():
            topic = db.get(DsaTopic, int(topic_id))
        if topic is None:
            stmt = select(DsaTopic).where(DsaTopic.slug == topic_id)
            topic = db.execute(stmt).scalars().first()

        if topic is not None:
            pc = _topic_problem_count(topic.id)
            try:
                from app.models.problem import Problem
                db_count = db.execute(select(Problem).where(Problem.topic_id == topic.id)).scalars().all()
                if db_count:
                    pc = len(db_count)
            except Exception:
                pass
            completed = _user_completed_for_topic(db, current_user, topic.id) if current_user else 0
            return {
                "success": True,
                "data": {
                    "id": topic.id,
                    "name": topic.name,
                    "slug": topic.slug,
                    "description": topic.description,
                    "icon": topic.icon,
                    "difficulty": topic.difficulty,
                    "category": topic.category,
                    "subtopics": topic.subtopics or [],
                    "problem_count": pc,
                    "completed_problems": completed,
                    "display_order": topic.display_order,
                    "is_published": topic.is_published,
                    "created_at": topic.created_at.isoformat() if topic.created_at else None,
                    "updated_at": topic.updated_at.isoformat() if topic.updated_at else None,
                },
            }

        # DB reachable but topic not found — fall through to seed before 404
        if db.execute(select(DsaTopic).limit(1)).scalars().first() is not None:
            raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")

    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("DB query for topic %s failed: %s", topic_id, exc)

    # --- Fallback to seed ---
    for raw in TOPICS_SEED:
        if str(raw["id"]) == topic_id or raw["slug"] == topic_id:
            resp = to_topic_response(raw)
            resp["problem_count"] = _topic_problem_count(raw["id"])
            resp["completed_problems"] = _user_completed_for_topic(db, current_user, raw["id"]) if current_user else 0
            return {"success": True, "data": resp}

    raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found")
