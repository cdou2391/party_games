import random
import string
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.jwt import create_token
from app.database import get_db
from app.models.user import User
from app.schemas.auth import GuestRequest, LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UpgradeRequest, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

ADJECTIVES = ["Cool", "Swift", "Brave", "Sly", "Wild", "Neon", "Crisp", "Bold", "Zany", "Epic"]
ANIMALS = ["Panda", "Fox", "Hawk", "Wolf", "Lynx", "Otter", "Viper", "Raven", "Moose", "Tiger"]


def _random_seed() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=12))


def _random_username() -> str:
    return random.choice(ADJECTIVES) + random.choice(ANIMALS) + str(random.randint(10, 99))


@router.post("/guest", response_model=TokenResponse)
async def create_guest(body: GuestRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(username=body.username, avatar_seed=_random_seed(), is_guest=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_token(user.id, is_guest=True))


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing_email = await db.execute(select(User).where(User.email == body.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    existing_username = await db.execute(select(User).where(User.username == body.username))
    if existing_username.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(
        username=body.username,
        email=body.email,
        password_hash=_hash_password(body.password),
        avatar_seed=_random_seed(),
        is_guest=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_token(user.id, is_guest=False))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenResponse(access_token=create_token(user.id, is_guest=False))


@router.post("/upgrade", response_model=TokenResponse)
async def upgrade_guest(
    body: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.is_guest:
        raise HTTPException(status_code=400, detail="Account is already registered")
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    current_user.email = body.email
    current_user.password_hash = _hash_password(body.password)
    current_user.is_guest = False
    await db.commit()
    return TokenResponse(access_token=create_token(current_user.id, is_guest=False))


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
