from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TopicBase(BaseModel):
    name: str
    slug: str
    description: str
    icon: str
    difficulty: str
    category: str
    subtopics: list[str] = []


class TopicCreate(TopicBase):
    display_order: int = 0


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # Frontend compatibility: computed / stored fields
    problem_count: int = 0
    completed_problems: int = 0  # placeholder until user-specific progress is wired
    display_order: int
    is_published: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TopicListResponse(BaseModel):
    success: bool = True
    data: list[TopicResponse]
    total: int
