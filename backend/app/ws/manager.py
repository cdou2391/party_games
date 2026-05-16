import asyncio
import uuid
from collections import defaultdict

from fastapi import WebSocket

from app.games.base import BaseGame


class ConnectionManager:
    def __init__(self):
        # session_id → { user_id → WebSocket }
        self._connections: dict[uuid.UUID, dict[uuid.UUID, WebSocket]] = defaultdict(dict)
        # session_id → BaseGame instance
        self._games: dict[uuid.UUID, BaseGame] = {}

    def connect(self, session_id: uuid.UUID, user_id: uuid.UUID, ws: WebSocket):
        self._connections[session_id][user_id] = ws

    def disconnect(self, session_id: uuid.UUID, user_id: uuid.UUID):
        self._connections[session_id].pop(user_id, None)

    def get_connected_users(self, session_id: uuid.UUID) -> list[uuid.UUID]:
        return list(self._connections[session_id].keys())

    async def broadcast(self, session_id: uuid.UUID, events: list[dict]):
        dead = []
        for uid, ws in list(self._connections[session_id].items()):
            for event in events:
                try:
                    await ws.send_json(event)
                except Exception:
                    dead.append(uid)
                    break
        for uid in dead:
            self.disconnect(session_id, uid)

    async def send_to(self, session_id: uuid.UUID, user_id: uuid.UUID, event: dict):
        ws = self._connections[session_id].get(user_id)
        if ws:
            try:
                await ws.send_json(event)
            except Exception:
                self.disconnect(session_id, user_id)

    def set_game(self, session_id: uuid.UUID, game: BaseGame):
        self._games[session_id] = game

    def get_game(self, session_id: uuid.UUID) -> BaseGame | None:
        return self._games.get(session_id)

    def remove_game(self, session_id: uuid.UUID):
        self._games.pop(session_id, None)


manager = ConnectionManager()
