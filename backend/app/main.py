from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import RateLimitMiddleware
from app.routers import auth, lobbies, users
from app.ws.router import router as ws_router

app = FastAPI(title="Party Games API", version="0.1.0")

# Middleware is applied outermost-first: rate limiting runs before CORS processing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(lobbies.router, prefix="/api")
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/games")
async def list_games():
    return [
        {"id": "trivia", "name": "Trivia", "description": "Answer questions as fast as possible", "min_players": 1, "max_players": 8},
        {"id": "couple_quiz", "name": "How Well Do You Know the Couple?", "description": "Test how well you know the couple", "min_players": 1, "max_players": 8},
    ]
