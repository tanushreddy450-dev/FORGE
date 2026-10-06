"""
Recommendations service — Phase 6

Explainable, deterministic recommendations based on real progress data.

Heuristics:
  - Weak topics: lowest solve rate or many attempts without solve
  - Improving: recent Accepted submissions
  - Avoid solved: don't repeat solved unless for review (weak topic)
  - Difficulty: recommend Easy for beginners, Medium/Hard as user progresses
  - Reason: human-readable explanation per recommendation
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _difficulty_order(d: str) -> int:
    return {"Easy": 0, "Medium": 1, "Hard": 2}.get(d, 99)


def get_recommendations(db: Session, user_id: str, limit: int = 5) -> list[dict]:
    try:
        from app.models.problem import Problem
        from app.models.submission import Submission
        from app.models.progress import UserProgress
        from app.data.seed import TOPICS_SEED

        # Solved ids
        solved_ids = set(
            db.execute(select(Submission.problem_id).where(Submission.user_id == user_id, Submission.status == "Accepted")).scalars().all()
        )

        # All problems
        all_problems = db.execute(select(Problem).order_by(Problem.id)).scalars().all()
        if not all_problems:
            raise ValueError("No problems in DB")

        # Submission counts per topic (for weak detection)
        # Need to map problem_id -> topic
        prob_by_id = {p.id: p for p in all_problems}
        attempts_by_topic: dict[int, int] = {}
        solved_by_topic: dict[int, int] = {}
        all_subs = db.execute(select(Submission).where(Submission.user_id == user_id)).scalars().all()
        for sub in all_subs:
            prob = prob_by_id.get(sub.problem_id)
            if not prob:
                continue
            attempts_by_topic[prob.topic_id] = attempts_by_topic.get(prob.topic_id, 0) + 1
            if sub.status == "Accepted" and sub.problem_id in solved_ids:
                # Count distinct solved per topic later
                pass
        # Count distinct solved per topic
        for pid in solved_ids:
            prob = prob_by_id.get(pid)
            if prob:
                solved_by_topic[prob.topic_id] = solved_by_topic.get(prob.topic_id, 0) + 1

        # Build topic solve rate map from TOPICS_SEED as fallback for total counts
        topic_total = {t["id"]: t["problem_count"] for t in TOPICS_SEED}
        topic_name = {t["id"]: t["name"] for t in TOPICS_SEED}

        # Find weak topics: lowest solve rate
        weak_topics: list[int] = []
        rates: list[tuple[int, float]] = []
        for tid, total in topic_total.items():
            solved = solved_by_topic.get(tid, 0)
            rate = solved / total if total else 0
            rates.append((tid, rate))
        rates.sort(key=lambda x: x[1])
        weak_topics = [tid for tid, _ in rates[:3]]

        # User's max difficulty solved (to decide next difficulty)
        progress = db.execute(select(UserProgress).where(UserProgress.user_id == user_id)).scalars().first()
        total_solved = len(solved_ids)
        if total_solved < 3:
            preferred = ["Easy"]
        elif total_solved < 10:
            preferred = ["Easy", "Medium"]
        else:
            preferred = ["Medium", "Hard", "Easy"]

        # Filter unsolved
        unsolved = [p for p in all_problems if p.id not in solved_ids]
        # Score each unsolved: weak topic boost + difficulty match + acceptance
        def score(p: Problem) -> tuple[int, int, float]:
            weak_score = 0 if p.topic_id in weak_topics else 1
            # Prefer weak topics
            diff_pref = 0 if p.difficulty in preferred else 1
            # Higher acceptance first (easier to start)
            return (weak_score, diff_pref, -p.acceptance)

        unsolved.sort(key=lambda p: (score(p), _difficulty_order(p.difficulty)))

        result: list[dict] = []
        for p in unsolved[:limit]:
            # Build explainable reason
            tname = topic_name.get(p.topic_id, p.topic.name if p.topic else "General")
            rate = solved_by_topic.get(p.topic_id, 0) / topic_total.get(p.topic_id, 1) if topic_total.get(p.topic_id) else 0
            if p.topic_id in weak_topics and rate < 0.3:
                reason = f"Focus on {tname} — you have solved {solved_by_topic.get(p.topic_id, 0)} of {topic_total.get(p.topic_id, '?')} there. This {p.difficulty} problem builds that foundation."
            elif p.topic_id in weak_topics:
                reason = f"Recommended to strengthen {tname} (weak topic). Progress: {int(rate*100)}%."
            elif total_solved == 0:
                reason = f"Great starting point in {tname} — beginner-friendly {p.difficulty}."
            elif p.difficulty in preferred:
                reason = f"Next step in {tname} — matches your current level ({p.difficulty})."
            else:
                reason = f"Popular in {tname} — {p.difficulty} challenge."

            result.append(
                {
                    "id": p.id,
                    "title": p.title,
                    "slug": p.slug,
                    "difficulty": p.difficulty,
                    "topic_name": p.topic.name if p.topic else tname,
                    "topic_id": p.topic_id,
                    "acceptance": p.acceptance,
                    "reason": reason,
                }
            )
        return result

    except Exception as exc:
        logger.warning("Recommendations DB failed, using seed fallback: %s", exc)
        from app.data.seed import PROBLEMS_SEED

        recs = []
        for p in PROBLEMS_SEED[:limit]:
            recs.append(
                {
                    "id": p["id"],
                    "title": p["title"],
                    "slug": p["slug"],
                    "difficulty": p["difficulty"],
                    "topic_name": p["topic_name"],
                    "topic_id": p["topic_id"],
                    "acceptance": p["acceptance"],
                    "reason": "Popular problem to start with — builds core DSA intuition.",
                }
            )
        return recs
