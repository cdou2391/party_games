import uuid
from datetime import datetime

from pydantic import BaseModel


class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    avatar_seed: str
    is_guest: bool
    total_score: int
    games_played: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    total_score: int
    games_played: int
    win_rate: float

    model_config = {"from_attributes": True}


class UpgradeRequest(BaseModel):
    email: str
    password: str
