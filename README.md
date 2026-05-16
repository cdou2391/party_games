# Party Games

Multiplayer party games platform. FastAPI backend + React frontend + PostgreSQL.

## Running with Docker (recommended)

```bash
# Build and start backend + frontend
docker-compose up --build

# Frontend → http://localhost:80
# Backend  → http://localhost:8000
```

The frontend container uses nginx which proxies `/api` and `/ws` to the backend container.

Run migrations once before first start (or after schema changes):

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

---

## Local dev (without Docker)

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL from DO dashboard
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

Vite proxies `/api` and `/ws` to `http://localhost:8000`.

---

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand (auth + game) |
| Real-time | Native WebSocket (`/ws/{session_id}?token=<jwt>`) |
| Backend | FastAPI + SQLAlchemy async |
| Database | PostgreSQL (docker-compose locally, DigitalOcean in prod) |
| Auth | JWT — guest accounts, optional upgrade to full account |

## Games

| Game | Description |
|---|---|
| **Trivia** | 10 rounds, 20s per question, speed bonus on correct answers |
| **Word Chain** | Chain words by last letter, 3 lives, 10s per turn |

## Adding a new game

1. Create `backend/app/games/<name>/game.py` implementing `BaseGame`
2. Register it in `backend/app/games/registry.py`
3. Create `frontend/src/games/<name>/<Name>Game.tsx`
4. Add a `case` in `frontend/src/pages/Game.tsx`

## Production (DigitalOcean)

Update `DATABASE_URL` in `.env` to point to your DO managed Postgres cluster:

```
DATABASE_URL=postgresql+asyncpg://user:pass@your-cluster.db.ondigitalocean.com:25060/party_games?ssl=require
```

Update `CORS_ORIGINS` to your frontend domain.
