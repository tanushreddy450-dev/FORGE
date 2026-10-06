from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON as GenericJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


JSONType = JSONB().with_variant(GenericJSON(), "sqlite")


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)  # Easy | Medium | Hard

    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("dsa_topics.id", ondelete="CASCADE"), nullable=False, index=True)
    topic: Mapped["DsaTopic"] = relationship("DsaTopic", back_populates="problems", lazy="joined")

    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    constraints: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)
    examples: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)
    test_cases: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)
    starter_code: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)

    acceptance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="problem", lazy="selectin")
