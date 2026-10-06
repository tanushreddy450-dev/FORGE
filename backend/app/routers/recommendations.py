from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.services.recommendations import get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", summary="Get personalized problem recommendations")
def list_recommendations(
    limit: int = Query(default=5, ge=1, le=20),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = getattr(current_user, "id", None) or current_user["id"] if isinstance(current_user, dict) else current_user.id  # type: ignore
    data = get_recommendations(db, user_id=str(user_id), limit=limit)
    return {"success": True, "data": data, "total": len(data)}
