import uuid
from abc import ABC, abstractmethod


class BaseGame(ABC):
    def __init__(self, session_id: uuid.UUID, player_ids: list[uuid.UUID], settings: dict):
        self.session_id = session_id
        self.player_ids = player_ids
        self.settings = settings

    @property
    @abstractmethod
    def game_type(self) -> str: ...

    @abstractmethod
    async def start(self) -> list[dict]:
        """Return list of WS events to broadcast on game start."""
        ...

    @abstractmethod
    async def handle_action(self, player_id: uuid.UUID, action: dict) -> list[dict]:
        """Process a player action; return list of WS events to broadcast."""
        ...

    @abstractmethod
    def get_state(self) -> dict:
        """Return full current game state snapshot."""
        ...
