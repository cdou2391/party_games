import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionStatus(str, Enum):
    waiting = "waiting"
    in_progress = "in_progress"
    finished = "finished"


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(String(16), default=SessionStatus.waiting, nullable=False)
    host_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    room_code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_players: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    host: Mapped["User"] = relationship(back_populates="hosted_sessions")  # noqa: F821
    players: Mapped[list["GamePlayer"]] = relationship(back_populates="session", cascade="all, delete-orphan")  # noqa: F821
    events: Mapped[list["GameEvent"]] = relationship(back_populates="session", cascade="all, delete-orphan")  # noqa: F821
