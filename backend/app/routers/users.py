import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.game_player import GamePlayer
from app.models.game_session import GameSession, SessionStatus
from app.models.user import User
from app.schemas.user import UserPublic, UserStats

router = APIRouter(prefix="/users", tags=["users"])


class GameHistoryItem(BaseModel):
    session_id: uuid.UUID
    game_type: str
    ended_at: datetime
    score: int
    rank: int
    total_players: int


@router.get("/me", response_model=UserPublic)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/stats", response_model=UserStats)
async def get_stats(current_user: User = Depends(get_current_user)):
    return UserStats(
        total_score=current_user.total_score,
        games_played=current_user.games_played,
        win_rate=0.0,
    )


@router.get("/me/history", response_model=list[GameHistoryItem])
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Subquery: rank each player within their session by score descending
    rank_sq = (
        select(
            GamePlayer.session_id,
            GamePlayer.user_id,
            GamePlayer.score,
            func.rank()
            .over(partition_by=GamePlayer.session_id, order_by=GamePlayer.score.desc())
            .label("rank"),
            func.count()
            .over(partition_by=GamePlayer.session_id)
            .label("total_players"),
        )
    ).subquery()

    result = await db.execute(
        select(
            GameSession.id,
            GameSession.game_type,
            GameSession.ended_at,
            rank_sq.c.score,
            rank_sq.c.rank,
            rank_sq.c.total_players,
        )
        .join(rank_sq, (rank_sq.c.session_id == GameSession.id) & (rank_sq.c.user_id == current_user.id))
        .where(GameSession.status == SessionStatus.finished)
        .order_by(GameSession.ended_at.desc())
        .limit(20)
    )

    rows = result.all()
    return [
        GameHistoryItem(
            session_id=row[0],
            game_type=row[1],
            ended_at=row[2],
            score=row[3],
            rank=int(row[4]),
            total_players=int(row[5]),
        )
        for row in rows
        if row[2] is not None  # skip games with no ended_at
    ]


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
