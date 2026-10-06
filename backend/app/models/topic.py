from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON as GenericJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# Use JSONB on Postgres, fallback to generic JSON for other dialects/tests
JSONType = JSONB().with_variant(GenericJSON(), "sqlite")


class DsaTopic(Base):
    __tablename__ = "dsa_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="BookOpen")
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)  # Beginner | Intermediate | Advanced
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="Data Structures")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Stored as JSON array of strings
    subtopics: Mapped[list] = mapped_column(JSONType, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    problems: Mapped[list["Problem"]] = relationship("Problem", back_populates="topic", lazy="selectin")
