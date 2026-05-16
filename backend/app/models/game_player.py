import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlayerStatus(str, Enum):
    active = "active"
    disconnected = "disconnected"
    finished = "finished"


class GamePlayer(Base):
    __tablename__ = "game_players"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("game_sessions.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[PlayerStatus] = mapped_column(String(16), default=PlayerStatus.active, nullable=False)
    is_ready: Mapped[bool] = mapped_column(default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    session: Mapped["GameSession"] = relationship(back_populates="players")  # noqa: F821
    user: Mapped["User"] = relationship(back_populates="game_players")  # noqa: F821
