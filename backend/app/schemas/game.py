import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


# ── Per-game settings schemas ──────────────────────────────────────────────────

class TriviaSettings(BaseModel):
    question_count: Annotated[int, Field(ge=1, le=50)] = 10
    difficulty: Literal["mixed", "easy", "medium", "hard", "impossible"] = "mixed"
    category: Literal[
        "mixed",
        "Arts & Music",
        "Food & Culture",
        "General",
        "Geography",
        "History",
        "Language",
        "Literature",
        "Math",
        "Nature",
        "Obscure Knowledge",
        "Science",
        "Sports",
        "Technology",
    ] = "mixed"


class CoupleQuizSettings(BaseModel):
    question_count: Annotated[int, Field(ge=1, le=50)] = 10


_GAME_SETTINGS: dict[str, type[BaseModel]] = {
    "trivia": TriviaSettings,
    "couple_quiz": CoupleQuizSettings,
}


# ── Request / response schemas ─────────────────────────────────────────────────

class CreateLobbyRequest(BaseModel):
    game_type: str
    is_public: bool = True
    max_players: Annotated[int, Field(ge=2, le=8)] = 8
    settings: dict = {}

    @model_validator(mode="after")
    def validate_game_settings(self) -> "CreateLobbyRequest":
        settings_cls = _GAME_SETTINGS.get(self.game_type)
        if settings_cls:
            # Parse the raw dict through the typed model; raises ValidationError on bad input.
            # Serialise back to a plain dict so the JSONB column stays schema-agnostic.
            self.settings = settings_cls(**self.settings).model_dump()
        return self


class LobbyResponse(BaseModel):
    id: uuid.UUID
    game_type: str
    status: str
    host_id: uuid.UUID
    room_code: str
    is_public: bool
    max_players: int
    player_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinByCodeRequest(BaseModel):
    room_code: str


class PlayerInSession(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_seed: str
    score: int
    status: str
    is_ready: bool

    model_config = {"from_attributes": True}


class SessionStateResponse(BaseModel):
    id: uuid.UUID
    game_type: str
    status: str
    room_code: str
    is_public: bool
    max_players: int
    host_id: uuid.UUID
    players: list[PlayerInSession]
    settings: dict

    model_config = {"from_attributes": True}
