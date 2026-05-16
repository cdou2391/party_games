import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.deps import get_current_user_ws
from app.database import AsyncSessionLocal, get_db
from app.games.registry import GAME_REGISTRY
from app.models.game_event import GameEvent
from app.models.game_player import GamePlayer, PlayerStatus
from app.models.game_session import GameSession, SessionStatus
from app.models.user import User
from app.ws.manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user_ws),
):
    await websocket.accept()

    async with AsyncSessionLocal() as db:
        session = await _load_session(db, session_id)
        if not session:
            await websocket.send_json({"type": "error", "payload": {"message": "Session not found"}})
            await websocket.close()
            return

        # Verify the connecting user is actually a member of this session
        is_member = any(p.user_id == current_user.id for p in session.players)
        if not is_member:
            await websocket.send_json({"type": "error", "payload": {"message": "Not a member of this session"}})
            await websocket.close()
            return

        manager.connect(session_id, current_user.id, websocket)

        # Send full state to the connecting player
        state = _build_session_state(session, current_user.id)
        game = manager.get_game(session_id)
        if game:
            state["game_state"] = game.get_state()
        await websocket.send_json({"type": "session_state", "payload": state})

        # Notify others
        await manager.broadcast(
            session_id,
            [
                {
                    "type": "player_joined",
                    "payload": {
                        "user_id": str(current_user.id),
                        "username": current_user.username,
                        "avatar_seed": current_user.avatar_seed,
                    },
                }
            ],
        )

    try:
        while True:
            data = await websocket.receive_json()
            await _handle_message(session_id, current_user, data)
    except WebSocketDisconnect:
        manager.disconnect(session_id, current_user.id)
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(GamePlayer)
                .where(GamePlayer.session_id == session_id, GamePlayer.user_id == current_user.id)
                .values(status=PlayerStatus.disconnected)
            )
            await db.commit()
        await manager.broadcast(
            session_id,
            [{"type": "player_left", "payload": {"user_id": str(current_user.id)}}],
        )


async def _handle_message(session_id: uuid.UUID, user: User, data: dict):
    msg_type = data.get("type")
    payload = data.get("payload", {})

    if msg_type == "ping":
        await manager.send_to(session_id, user.id, {"type": "pong", "payload": {}})
        return

    if msg_type == "ready":
        await _handle_ready(session_id, user)
        return

    if msg_type == "game_action":
        game = manager.get_game(session_id)
        if game:
            events = await game.handle_action(user.id, payload)
            if events:
                await manager.broadcast(session_id, events)
        return


async def _handle_ready(session_id: uuid.UUID, user: User):
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(GamePlayer)
            .where(GamePlayer.session_id == session_id, GamePlayer.user_id == user.id)
            .values(is_ready=True)
        )
        await db.commit()

        session = await _load_session(db, session_id)
        if not session:
            return

        await manager.broadcast(
            session_id,
            [{"type": "player_ready", "payload": {"user_id": str(user.id)}}],
        )

        # Auto-start if host and all players ready (min 2 players for word_chain, 1 for trivia debug)
        is_host = session.host_id == user.id
        all_ready = all(p.is_ready for p in session.players)
        enough_players = len(session.players) >= 1

        if is_host and all_ready and enough_players and session.status == SessionStatus.waiting:
            await _start_game(db, session)


async def _start_game(db: AsyncSession, session: GameSession):
    session.status = SessionStatus.in_progress
    session.started_at = datetime.now(timezone.utc)
    await db.commit()

    player_ids = [p.user_id for p in session.players]
    game_cls = GAME_REGISTRY[session.game_type]

    async def broadcast_fn(events: list[dict]):
        await manager.broadcast(session.id, events)
        async with AsyncSessionLocal() as ev_db:
            for e in events:
                ev_db.add(GameEvent(session_id=session.id, event_type=e["type"], payload=e.get("payload", {})))
                if e["type"] == "game_ended":
                    await ev_db.execute(
                        update(GameSession)
                        .where(GameSession.id == session.id)
                        .values(status=SessionStatus.finished, ended_at=datetime.now(timezone.utc))
                    )
                    for r in e["payload"].get("rankings", []):
                        pid = uuid.UUID(r["player_id"])
                        score = r["score"]
                        await ev_db.execute(
                            update(GamePlayer)
                            .where(GamePlayer.session_id == session.id, GamePlayer.user_id == pid)
                            .values(score=score, status=PlayerStatus.finished)
                        )
                        await ev_db.execute(
                            update(User)
                            .where(User.id == pid)
                            .values(
                                total_score=User.total_score + score,
                                games_played=User.games_played + 1,
                            )
                        )
            await ev_db.commit()

    game = game_cls(session.id, player_ids, session.settings, broadcast_fn)
    manager.set_game(session.id, game)
    events = await game.start()
    await manager.broadcast(session.id, events)


async def _load_session(db: AsyncSession, session_id: uuid.UUID) -> GameSession | None:
    result = await db.execute(
        select(GameSession)
        .where(GameSession.id == session_id)
        .options(selectinload(GameSession.players).selectinload(GamePlayer.user))
    )
    return result.scalar_one_or_none()


def _build_session_state(session: GameSession, viewer_id: uuid.UUID) -> dict:
    return {
        "id": str(session.id),
        "game_type": session.game_type,
        "status": session.status,
        "room_code": session.room_code,
        "host_id": str(session.host_id),
        "max_players": session.max_players,
        "settings": session.settings,
        "players": [
            {
                "user_id": str(p.user_id),
                "username": p.user.username,
                "avatar_seed": p.user.avatar_seed,
                "score": p.score,
                "status": p.status,
                "is_ready": p.is_ready,
            }
            for p in session.players
        ],
    }
