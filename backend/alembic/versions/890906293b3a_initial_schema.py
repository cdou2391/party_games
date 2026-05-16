"""initial schema

Revision ID: 890906293b3a
Revises: 
Create Date: 2026-05-13 22:33:13.054653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision: str = '890906293b3a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(32), unique=True, nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_guest", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("avatar_seed", sa.String(64), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("games_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "game_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("game_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="waiting"),
        sa.Column("host_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("room_code", sa.String(6), unique=True, nullable=False),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("max_players", sa.Integer(), nullable=False, server_default="8"),
        sa.Column("settings", JSONB(), nullable=False, server_default="{}"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "game_players",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("game_sessions.id"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("is_ready", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "game_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), sa.ForeignKey("game_sessions.id"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("payload", JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_index("ix_game_sessions_room_code", "game_sessions", ["room_code"], unique=True)
    op.create_index("ix_game_sessions_status_public", "game_sessions", ["status", "is_public"])
    op.create_index("ix_game_players_session", "game_players", ["session_id"])
    op.create_index("ix_game_events_session", "game_events", ["session_id"])


def downgrade() -> None:
    op.drop_table("game_events")
    op.drop_table("game_players")
    op.drop_table("game_sessions")
    op.drop_table("users")
