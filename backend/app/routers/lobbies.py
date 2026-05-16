import random
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user
from app.database import get_db
from app.games.registry import GAME_REGISTRY
from app.models.game_player import GamePlayer, PlayerStatus
from app.models.game_session import GameSession, SessionStatus
from app.models.user import User
from app.schemas.game import CreateLobbyRequest, JoinByCodeRequest, LobbyResponse, SessionStateResponse, PlayerInSession

router = APIRouter(prefix="/lobbies", tags=["lobbies"])


def _gen_room_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _session_to_response(session: GameSession, player_count: int) -> LobbyResponse:
    return LobbyResponse(
        id=session.id,
        game_type=session.game_type,
        status=session.status,
        host_id=session.host_id,
        room_code=session.room_code,
        is_public=session.is_public,
        max_players=session.max_players,
        player_count=player_count,
        created_at=session.created_at,
    )


@router.get("", response_model=list[LobbyResponse])
async def list_lobbies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GameSession)
        .where(GameSession.is_public == True, GameSession.status == SessionStatus.waiting)
        .options(selectinload(GameSession.players))
        .order_by(GameSession.created_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [_session_to_response(s, len(s.players)) for s in sessions]


@router.post("", response_model=LobbyResponse, status_code=201)
async def create_lobby(
    body: CreateLobbyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.game_type not in GAME_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unknown game type: {body.game_type}")

    for _ in range(10):
        game_session = GameSession(
            game_type=body.game_type,
            host_id=current_user.id,
            room_code=_gen_room_code(),
            is_public=body.is_public,
            max_players=body.max_players,
            settings=body.settings,
        )
        db.add(game_session)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            continue

        player = GamePlayer(session_id=game_session.id, user_id=current_user.id)
        db.add(player)
        await db.commit()
        await db.refresh(game_session)
        return _session_to_response(game_session, 1)

    raise HTTPException(status_code=500, detail="Could not generate unique room code")


@router.post("/join", response_model=SessionStateResponse)
async def join_by_code(
    body: JoinByCodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession)
        .where(GameSession.room_code == body.room_code.upper())
        .options(selectinload(GameSession.players).selectinload(GamePlayer.user))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Room not found")
    if session.status != SessionStatus.waiting:
        raise HTTPException(status_code=409, detail="Game already started")
    if len(session.players) >= session.max_players:
        raise HTTPException(status_code=409, detail="Room is full")

    already = any(p.user_id == current_user.id for p in session.players)
    if not already:
        player = GamePlayer(session_id=session.id, user_id=current_user.id)
        db.add(player)
        await db.commit()
        await db.refresh(session)
        result2 = await db.execute(
            select(GameSession)
            .where(GameSession.id == session.id)
            .options(selectinload(GameSession.players).selectinload(GamePlayer.user))
        )
        session = result2.scalar_one()

    return _build_state_response(session)


@router.get("/{session_id}", response_model=SessionStateResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GameSession)
        .where(GameSession.id == session_id)
        .options(selectinload(GameSession.players).selectinload(GamePlayer.user))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not any(p.user_id == current_user.id for p in session.players):
        raise HTTPException(status_code=403, detail="Not a member of this session")
    return _build_state_response(session)


def _build_state_response(session: GameSession) -> SessionStateResponse:
    players = [
        PlayerInSession(
            user_id=p.user_id,
            username=p.user.username,
            avatar_seed=p.user.avatar_seed,
            score=p.score,
            status=p.status,
            is_ready=p.is_ready,
        )
        for p in session.players
    ]
    return SessionStateResponse(
        id=session.id,
        game_type=session.game_type,
        status=session.status,
        room_code=session.room_code,
        is_public=session.is_public,
        max_players=session.max_players,
        host_id=session.host_id,
        players=players,
        settings=session.settings,
    )
