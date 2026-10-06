from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    total_solved: int
    easy_solved: int
    medium_solved: int
    hard_solved: int
    streak: int
    total_submissions: int
    topics_completed: int
    rank: str
    updated_at: datetime | None = None
