"""
Learning Insights service — deterministic summary from actual stored data.

No LLM calls. Computes strong/weak topics, difficulty breakdown, streak,
and next recommendations from submissions + progress.

Used by GET /api/insights and by Dashboard for AI-suggestion fallback.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import select

logger = logging.getLogger(__name__)


def get_learning_insights(db: Session, user_id: str) -> dict:
    try:
        from app.models.problem import Problem
        from app.models.submission import Submission
        from app.models.progress import UserProgress
        from app.data.seed import TOPICS_SEED, PROBLEMS_SEED

        # Progress row
        prog = db.execute(select(UserProgress).where(UserProgress.user_id == user_id)).scalars().first()

        # Submissions
        all_subs = db.execute(select(Submission).where(Submission.user_id == user_id)).scalars().all()
        solved_ids = set(
            db.execute(select(Submission.problem_id).where(Submission.user_id == user_id, Submission.status == "Accepted")).scalars().all()
        )

        total_solved = len(solved_ids)
        total_submissions = len(all_subs)

        # Problems map
        all_problems = db.execute(select(Problem).order_by(Problem.id)).scalars().all()
        prob_by_id = {p.id: p for p in all_problems}
        # Fallback to seed if DB empty
        if not all_problems:
            all_problems = []  # type: ignore
            prob_by_id = {}

        # Difficulty distribution of solved
        diff_dist = {"Easy": 0, "Medium": 0, "Hard": 0}
        for pid in solved_ids:
            prob = prob_by_id.get(pid)
            if prob and prob.difficulty in diff_dist:
                diff_dist[prob.difficulty] += 1
            else:
                # Seed fallback lookup
                for p in PROBLEMS_SEED:
                    if p["id"] == pid and p["difficulty"] in diff_dist:
                        diff_dist[p["difficulty"]] += 1
                        break

        # Topic stats
        topic_total = {t["id"]: t["problem_count"] for t in TOPICS_SEED}
        topic_name = {t["id"]: t["name"] for t in TOPICS_SEED}
        solved_by_topic: dict[int, int] = {}
        attempts_by_topic: dict[int, int] = {}
        for sub in all_subs:
            prob = prob_by_id.get(sub.problem_id)
            tid = prob.topic_id if prob else None
            if tid is None:
                for p in PROBLEMS_SEED:
                    if p["id"] == sub.problem_id:
                        tid = p["topic_id"]
                        break
            if tid is None:
                continue
            attempts_by_topic[tid] = attempts_by_topic.get(tid, 0) + 1
        for pid in solved_ids:
            prob = prob_by_id.get(pid)
            tid = prob.topic_id if prob else None
            if tid is None:
                for p in PROBLEMS_SEED:
                    if p["id"] == pid:
                        tid = p["topic_id"]
                        break
            if tid is not None:
                solved_by_topic[tid] = solved_by_topic.get(tid, 0) + 1

        # Compute per-topic mastery rate
        topic_rates: list[tuple[int, float, int, int]] = []  # tid, rate, solved, total
        for tid, total in topic_total.items():
            solved = solved_by_topic.get(tid, 0)
            rate = solved / total if total else 0
            topic_rates.append((tid, rate, solved, total))
        topic_rates.sort(key=lambda x: x[1], reverse=True)

        # Strong topics: top 2 with at least 1 solved
        strong = [ {"topic_id": tid, "topic_name": topic_name.get(tid, str(tid)), "solved": s, "total": t, "rate": round(rate*100,1)} for tid, rate, s, t in topic_rates if s > 0][:3]
        # Weak topics: bottom 3 (including zero solved, but prioritize those with attempts)
        weak_sorted = sorted(topic_rates, key=lambda x: (x[1], -attempts_by_topic.get(x[0], 0)))
        weak = [ {"topic_id": tid, "topic_name": topic_name.get(tid, str(tid)), "solved": s, "total": t, "rate": round(rate*100,1), "attempts": attempts_by_topic.get(tid, 0)} for tid, rate, s, t in weak_sorted[:3]]

        # Recommended next topic: weakest with at least one unsolved
        recommended_next_topic = weak[0] if weak else None
        # If all 0 solved, recommend Arrays (first topic) as entry
        if total_solved == 0 and topic_rates:
            # Prefer Beginner topic with not started
            for tid, rate, s, t in topic_rates:
                if rate == 0:
                    # Find Beginner topic
                    for topic in TOPICS_SEED:
                        if topic["id"] == tid and topic["difficulty"] == "Beginner":
                            recommended_next_topic = {"topic_id": tid, "topic_name": topic["name"], "solved": s, "total": t, "rate": 0}
                            break
                    if recommended_next_topic and recommended_next_topic["topic_name"] != weak[0]["topic_name"]:
                        break

        # Streak and rank from progress
        streak = prog.streak if prog else 0
        rank = prog.rank if prog else "Beginner"

        # Deterministic suggestions (no LLM)
        suggestions: list[str] = []
        if total_solved == 0:
            suggestions.append("Start with Arrays and Strings — solve 2-3 Easy problems to build momentum.")
        if weak:
            w = weak[0]
            suggestions.append(f"Focus next on {w['topic_name']} — you are at {w['rate']}% there ({w['solved']}/{w['total']}). One Easy problem in that topic will boost mastery.")
        if diff_dist["Easy"] > 0 and diff_dist["Medium"] == 0:
            suggestions.append("You have mastered Easy — try a Medium problem like Maximum Subarray to stretch.")
        if total_submissions > 0 and total_solved == 0:
            suggestions.append("You have attempts but no Accepted yet — use the AI Tutor's Hint 1 before rewriting, and check edge cases.")
        if streak >= 3:
            suggestions.append(f"Great {streak}-day streak! Keep it — solve one problem per day to maintain rank {rank}.")
        if not suggestions:
            suggestions.append("Keep balanced practice: alternate between weak topics and new difficulties.")

        return {
            "user_id": user_id,
            "strong_topics": strong,
            "weak_topics": weak,
            "problems_solved": total_solved,
            "total_submissions": total_submissions,
            "difficulty_distribution": diff_dist,
            "streak": streak,
            "rank": rank,
            "recommended_next_topic": recommended_next_topic,
            "suggestions": suggestions,
        }
    except Exception as exc:
        logger.warning("Insights failed, using in-memory fallback: %s", exc)
        # In-memory fallback for dev without Postgres
        try:
            from app.services.progress import _memory_progress, _memory_solved
            from app.data.seed import TOPICS_SEED, PROBLEMS_SEED

            mem_prog = _memory_progress.get(user_id, {})
            total_solved = mem_prog.get("total_solved", 0) if mem_prog else 0
            total_submissions = mem_prog.get("total_submissions", 0) if mem_prog else 0
            diff_dist = {
                "Easy": mem_prog.get("easy_solved", 0) if mem_prog else 0,
                "Medium": mem_prog.get("medium_solved", 0) if mem_prog else 0,
                "Hard": mem_prog.get("hard_solved", 0) if mem_prog else 0,
            }
            solved_ids = _memory_solved.get(user_id, set())
            # Topic rates from seed
            topic_total = {t["id"]: t["problem_count"] for t in TOPICS_SEED}
            topic_name = {t["id"]: t["name"] for t in TOPICS_SEED}
            solved_by_topic: dict[int, int] = {}
            for pid in solved_ids:
                for p in PROBLEMS_SEED:
                    if p["id"] == pid:
                        tid = p["topic_id"]
                        solved_by_topic[tid] = solved_by_topic.get(tid, 0) + 1
                        break
            topic_rates: list[tuple[int, float, int, int]] = []
            for tid, total in topic_total.items():
                s = solved_by_topic.get(tid, 0)
                rate = s / total if total else 0
                topic_rates.append((tid, rate, s, total))
            topic_rates.sort(key=lambda x: x[1], reverse=True)
            strong = [{"topic_id": tid, "topic_name": topic_name.get(tid, str(tid)), "solved": s, "total": t, "rate": round(rate*100,1)} for tid, rate, s, t in topic_rates if s > 0][:3]
            weak_sorted = sorted(topic_rates, key=lambda x: x[1])
            weak = [{"topic_id": tid, "topic_name": topic_name.get(tid, str(tid)), "solved": s, "total": t, "rate": round(rate*100,1), "attempts": 0} for tid, rate, s, t in weak_sorted[:3]]
            streak = mem_prog.get("streak", 0) if mem_prog else 0
            rank = mem_prog.get("rank", "Beginner") if mem_prog else "Beginner"
            rec_next = weak[0] if weak else None
            if total_solved == 0:
                suggestions = ["Start with Arrays and Strings — solve 2-3 Easy problems to build momentum."]
                if weak:
                    suggestions.append(f"Focus next on {weak[0]['topic_name']} — {weak[0]['rate']}% there.")
            else:
                suggestions = [f"Focus on {weak[0]['topic_name']} — {weak[0]['rate']}% there."] if weak else ["Keep practicing."]
            return {
                "user_id": user_id,
                "strong_topics": strong,
                "weak_topics": weak,
                "problems_solved": total_solved,
                "total_submissions": total_submissions,
                "difficulty_distribution": diff_dist,
                "streak": streak,
                "rank": rank,
                "recommended_next_topic": rec_next,
                "suggestions": suggestions,
            }
        except Exception as e2:
            logger.warning("In-memory insights fallback also failed: %s", e2)
            return {
                "user_id": user_id,
                "strong_topics": [],
                "weak_topics": [{"topic_name": "Arrays", "solved": 0, "total": 24, "rate": 0, "attempts": 0}, {"topic_name": "Strings", "solved": 0, "total": 18, "rate": 0, "attempts": 0}, {"topic_name": "Linked Lists", "solved": 0, "total": 18, "rate": 0, "attempts": 0}],
                "problems_solved": 0,
                "total_submissions": 0,
                "difficulty_distribution": {"Easy": 0, "Medium": 0, "Hard": 0},
                "streak": 0,
                "rank": "Beginner",
                "recommended_next_topic": {"topic_name": "Arrays", "rate": 0, "solved": 0, "total": 24},
                "suggestions": ["Start with Arrays — beginner-friendly and foundational."],
            }
