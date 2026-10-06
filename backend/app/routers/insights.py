from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.services.insights import get_learning_insights
from app.services.recommendations import get_recommendations

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("", summary="Get deterministic learning insights for current user")
def get_insights(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(getattr(current_user, "id", None))  # type: ignore
    data = get_learning_insights(db, user_id)
    return {"success": True, "data": data}


@router.get("/recommendations", summary="Get insights + recommendations combined")
def get_insights_with_recs(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(getattr(current_user, "id", None))  # type: ignore
    insights = get_learning_insights(db, user_id)
    recs = get_recommendations(db, user_id, limit=5)
    return {"success": True, "data": {"insights": insights, "recommendations": recs}}
