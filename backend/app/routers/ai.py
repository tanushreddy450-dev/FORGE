import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.core.deps import get_current_user, get_current_user_optional
from app.db.session import get_db
from app.models.tutor import TutorConversation, TutorMessage
from app.models.problem import Problem
from app.schemas.tutor import (
    ConceptRequest,
    HintRequest,
    ExplainRequest,
    ComplexityRequest,
    AskRequest,
    ConversationCreate,
    MentorRequest,
    MentorInteractRequest,
    TTSRequest,
)
from app.services.ai_tutor import (
    explain_concept_sync,
    get_hint_sync,
    explain_mistake_sync,
    explain_complexity_sync,
    ask_sync,
    analyze_mentor_sync,
    interact_mentor_sync,
    generate_speech_sync,
    extract_student_learning_context,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["ai"])

# In-memory fallback for conversations when DB unavailable
_memory_conversations: dict[int, dict] = {}
_memory_messages: dict[int, list[dict]] = {}
_mem_next_id: int = 1


def _get_problem_meta(db: Session, problem_id: int) -> tuple[str, str, str]:
    """Return (title, topic, description) for a problem_id, with seed fallback."""
    try:
        prob = db.get(Problem, problem_id)
        if prob:
            return prob.title, prob.topic.name if prob.topic else "General", prob.description[:500]
    except Exception:
        pass
    # Seed fallback
    try:
        from app.data.seed import PROBLEMS_SEED

        for p in PROBLEMS_SEED:
            if p["id"] == problem_id:
                return p["title"], p["topic_name"], p["description"][:500]
    except Exception:
        pass
    return f"Problem {problem_id}", "General", ""


@router.post("/concept", summary="Explain concept behind a problem (beginner-friendly)")
def explain_concept(payload: ConceptRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    title = payload.title or ""
    topic = payload.topic or ""
    desc = payload.description or ""
    if not title or not topic:
        t, top, d = _get_problem_meta(db, payload.problem_id)
        title = title or t
        topic = topic or top
        desc = desc or d
    data = explain_concept_sync(problem_id=payload.problem_id, title=title, topic=topic, description=desc)
    return {"success": True, "data": data}


@router.post("/hint", summary="Get a progressive hint for a problem")
def get_hint(payload: HintRequest, current_user=Depends(get_current_user)):
    data = get_hint_sync(problem_id=payload.problem_id, hint_level=payload.hint_level)
    return {"success": True, "data": data}


@router.post("/explain", summary="Explain a mistake in user code")
def explain_mistake(payload: ExplainRequest, current_user=Depends(get_current_user)):
    data = explain_mistake_sync(problem_id=payload.problem_id, code=payload.code, error=payload.error)
    return {"success": True, "data": data}


@router.post("/complexity", summary="Explain time/space complexity")
def explain_complexity(payload: ComplexityRequest, current_user=Depends(get_current_user)):
    data = explain_complexity_sync(problem_id=payload.problem_id, code=payload.code)
    return {"success": True, "data": data}


@router.post("/mentor", summary="AlgoMentor real-time analysis and 3D visual explanation")
def analyze_mentor_endpoint(
    payload: MentorRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.title or not payload.topic:
        t, top, d = _get_problem_meta(db, payload.problem_id)
        payload.title = payload.title or t
        payload.topic = payload.topic or top
        payload.description = payload.description or d

    # Personalization: extract real learning signals scoped strictly to the authenticated student
    if not payload.learning_profile:
        user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else None)
        payload.learning_profile = extract_student_learning_context(
            db=db,
            user_id=str(user_id) if user_id else None,
            problem_id=payload.problem_id,
            topic=payload.topic,
        )

    data = analyze_mentor_sync(payload)
    return {"success": True, "data": data}


@router.post("/mentor/interact", summary="AlgoMentor interactive Socratic tutoring turn")
def interact_mentor_endpoint(
    payload: MentorInteractRequest,
    current_user=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    if not payload.title or not payload.topic:
        t, top, d = _get_problem_meta(db, payload.problem_id)
        payload.title = payload.title or t
        payload.topic = payload.topic or top
        payload.description = payload.description or d

    data = interact_mentor_sync(payload)
    return {"success": True, "data": data}


@router.post("/tts", summary="Generate TTS voice audio for an explanation")
def generate_tts_endpoint(
    payload: TTSRequest,
    current_user=Depends(get_current_user_optional),
):
    try:
        data = generate_speech_sync(payload.text, payload.voice)
        return {"success": True, "data": data}
    except Exception as exc:
        logger.error("TTS endpoint error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Voice explanation unavailable: {exc}")


@router.post("/ask", summary="Ask tutor a natural-language question (with optional code/history)")
def ask_tutor(payload: AskRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = getattr(current_user, "id", None)  # type: ignore
    # If conversation_id provided, try to load history for context
    history: list[dict] = []
    if payload.conversation_id is not None:
        try:
            conv = db.get(TutorConversation, payload.conversation_id)
            if conv and str(conv.user_id) == str(user_id):
                msgs = db.execute(select(TutorMessage).where(TutorMessage.conversation_id == conv.id).order_by(TutorMessage.created_at)).scalars().all()
                history = [{"role": m.role, "content": m.content} for m in msgs]
            elif payload.conversation_id in _memory_conversations and str(_memory_conversations[payload.conversation_id].get("user_id")) == str(user_id):
                history = _memory_messages.get(payload.conversation_id, [])  # type: ignore
        except Exception as exc:
            logger.warning("Ask: failed to load conversation history: %s", exc)

    data = ask_sync(problem_id=payload.problem_id, question=payload.question, code=payload.code, history=history)
    # Optionally persist if conversation_id provided
    if payload.conversation_id is not None:
        try:
            conv = db.get(TutorConversation, payload.conversation_id)
            if conv and str(conv.user_id) == str(user_id):
                db.add(TutorMessage(conversation_id=conv.id, role="user", content=payload.question))
                db.add(TutorMessage(conversation_id=conv.id, role="assistant", content=data["answer"]))
                db.commit()
            elif payload.conversation_id in _memory_conversations:
                _memory_messages.setdefault(payload.conversation_id, []).append({"role": "user", "content": payload.question})
                _memory_messages[payload.conversation_id].append({"role": "assistant", "content": data["answer"]})
        except Exception as exc:
            logger.warning("Ask: failed to persist conversation: %s", exc)

    return {"success": True, "data": data}


# --- Conversation CRUD ---

@router.post("/conversations", summary="Create a new tutor conversation")
def create_conversation(payload: ConversationCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = getattr(current_user, "id", None)  # type: ignore
    title = payload.title
    if not title and payload.problem_id:
        try:
            t, _, _ = _get_problem_meta(db, payload.problem_id)
            title = f"{t} — Tutor"
        except Exception:
            title = "New Conversation"
    title = title or "New Conversation"
    try:
        conv = TutorConversation(user_id=str(user_id), problem_id=payload.problem_id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return {"success": True, "data": {"id": conv.id, "user_id": conv.user_id, "problem_id": conv.problem_id, "title": conv.title, "created_at": conv.created_at.isoformat() if conv.created_at else None}}
    except Exception as exc:
        logger.warning("Create conversation DB failed, using memory: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
        global _mem_next_id
        cid = _mem_next_id
        _mem_next_id += 1
        _memory_conversations[cid] = {"id": cid, "user_id": str(user_id), "problem_id": payload.problem_id, "title": title, "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}
        _memory_messages[cid] = []
        return {"success": True, "data": _memory_conversations[cid]}


@router.get("/conversations", summary="List user's tutor conversations")
def list_conversations(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(getattr(current_user, "id", None))  # type: ignore
    try:
        rows = db.execute(select(TutorConversation).where(TutorConversation.user_id == user_id).order_by(desc(TutorConversation.updated_at))).scalars().all()
        data = [{"id": r.id, "user_id": r.user_id, "problem_id": r.problem_id, "title": r.title, "created_at": r.created_at.isoformat() if r.created_at else None, "updated_at": r.updated_at.isoformat() if r.updated_at else None, "message_count": len(r.messages)} for r in rows]
        # Merge memory
        for cid, conv in _memory_conversations.items():
            if str(conv.get("user_id")) == user_id and not any(d["id"] == cid for d in data):
                data.append({**conv, "message_count": len(_memory_messages.get(cid, [])), "updated_at": conv.get("created_at")})
        return {"success": True, "data": data}
    except Exception as exc:
        logger.warning("List conversations failed: %s", exc)
        data = [v for v in _memory_conversations.values() if str(v.get("user_id")) == user_id]
        return {"success": True, "data": data}


@router.get("/conversations/{conv_id}", summary="Get conversation with messages")
def get_conversation(conv_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(getattr(current_user, "id", None))  # type: ignore
    try:
        conv = db.get(TutorConversation, conv_id)
        if conv:
            if str(conv.user_id) != user_id:
                raise HTTPException(status_code=403, detail="Not authorized for this conversation")
            msgs = db.execute(select(TutorMessage).where(TutorMessage.conversation_id == conv.id).order_by(TutorMessage.created_at)).scalars().all()
            return {
                "success": True,
                "data": {
                    "id": conv.id,
                    "user_id": conv.user_id,
                    "problem_id": conv.problem_id,
                    "title": conv.title,
                    "created_at": conv.created_at.isoformat() if conv.created_at else None,
                    "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat() if m.created_at else None} for m in msgs],
                },
            }
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Get conversation DB failed: %s", exc)
    # Memory fallback
    if conv_id in _memory_conversations and str(_memory_conversations[conv_id].get("user_id")) == user_id:
        return {"success": True, "data": {"id": conv_id, **_memory_conversations[conv_id], "messages": _memory_messages.get(conv_id, [])}}
    raise HTTPException(status_code=404, detail="Conversation not found")


@router.post("/conversations/{conv_id}/messages", summary="Send a message in a conversation (Ask Tutor with history)")
def post_conversation_message(conv_id: int, payload: dict, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(getattr(current_user, "id", None))  # type: ignore
    content = (payload.get("content") or payload.get("question") or "").strip()
    problem_id = int(payload.get("problem_id") or 0) or None
    code = payload.get("code") or ""
    if not content:
        raise HTTPException(status_code=400, detail="Message content is required")

    # Verify ownership and get problem_id from conversation if not provided
    conv_obj = None
    try:
        conv_obj = db.get(TutorConversation, conv_id)
        if conv_obj:
            if str(conv_obj.user_id) != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            problem_id = problem_id or conv_obj.problem_id
            # Persist user message
            db.add(TutorMessage(conversation_id=conv_id, role="user", content=content))
            db.flush()
            # Load history for context
            history_rows = db.execute(select(TutorMessage).where(TutorMessage.conversation_id == conv_id).order_by(TutorMessage.created_at)).scalars().all()
            history = [{"role": m.role, "content": m.content} for m in history_rows]
            # Generate answer
            data = ask_sync(problem_id=problem_id or 0, question=content, code=code, history=history)
            db.add(TutorMessage(conversation_id=conv_id, role="assistant", content=data["answer"]))
            db.commit()
            return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Post message DB failed, trying memory: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass

    # Memory fallback
    if conv_id in _memory_conversations and str(_memory_conversations[conv_id].get("user_id")) == user_id:
        if problem_id is None:
            problem_id = _memory_conversations[conv_id].get("problem_id")
        _memory_messages.setdefault(conv_id, []).append({"role": "user", "content": content})
        history = _memory_messages[conv_id]
        data = ask_sync(problem_id=problem_id or 0, question=content, code=code, history=history)
        _memory_messages[conv_id].append({"role": "assistant", "content": data["answer"]})
        return {"success": True, "data": data}

    raise HTTPException(status_code=404, detail="Conversation not found")
