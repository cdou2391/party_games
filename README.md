# Party Games

Multiplayer party games platform. Play with friends — no account needed to join.

**Stack:** FastAPI · SQLAlchemy async · PostgreSQL · React 18 · Vite · TypeScript · Tailwind CSS · WebSockets

---

## Games

| Game | Description |
|---|---|
| **Trivia** | Up to 10 rounds, 20 s per question, speed bonus on correct answers |
| **Couple Quiz** | "How well do you know the couple?" — guests guess the couple's pre-set answers |

---

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — see Environment section below
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000/api

Migrations run automatically on backend startup (`alembic upgrade head` in `start.sh`).

---

## Local dev (without Docker)

**Backend**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
pnpm install
pnpm dev   # http://localhost:5173
```

Vite proxies `/api` and `/ws` to `http://localhost:8000`.

---

## Environment

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Description |
|---|---|
| `DATABASE_URL` | asyncpg connection string — e.g. `postgresql+asyncpg://user:pass@localhost:5432/party_games` |
| `JWT_SECRET` | Random secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | `HS256` (default) |
| `JWT_EXPIRE_MINUTES` | Token lifetime in minutes — default `10080` (7 days) |
| `CORS_ORIGINS` | Comma-separated allowed origins — e.g. `https://yourdomain.com` |

> **Never commit `backend/.env`.** It is listed in `.gitignore`. For production, inject these values as runtime environment variables rather than a file.

---

## Architecture

```
party_games/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, rate limiting middleware
│   │   ├── config.py        # pydantic-settings (reads from env)
│   │   ├── database.py      # async SQLAlchemy engine
│   │   ├── auth/            # JWT encode/decode, FastAPI dependencies
│   │   ├── routers/         # REST: auth, users, lobbies
│   │   ├── ws/              # WebSocket connection manager + router
│   │   ├── games/           # BaseGame, registry, per-game logic
│   │   └── models/          # SQLAlchemy ORM models
│   ├── alembic/             # DB migrations
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/             # Axios client + typed API functions
│       ├── store/           # Zustand: authStore, gameStore
│       ├── hooks/           # useGameSocket (WS connect/message dispatch)
│       ├── pages/           # Home, Lobby, Room, Game, Login, Profile
│       ├── games/           # Per-game UI: TriviaGame, CoupleQuizGame
│       └── components/      # PlayerCard, ScoreBoard, Timer, Avatar, …
└── docker-compose.yml
```

### Auth flow

- **Guest:** `POST /api/auth/guest` → JWT (no password required)
- **Register:** `POST /api/auth/register` → JWT
- **Login:** `POST /api/auth/login` → JWT
- **Upgrade:** `POST /api/auth/upgrade` — promotes a guest account to full account in-place; all history preserved

Tokens are stored in `sessionStorage` (cleared on tab close).

### WebSocket protocol

Endpoint: `WS /ws/{session_id}?token=<jwt>`

All messages follow `{ "type": "...", "payload": { ... } }`.

| Direction | Type | When |
|---|---|---|
| Client → Server | `ready` | Player clicks Ready |
| Client → Server | `game_action` | Submit answer or other action |
| Client → Server | `ping` | Keepalive every 30 s |
| Server → Client | `session_state` | Full state on connect |
| Server → Client | `player_joined` / `player_left` | Roster change |
| Server → Client | `game_started` / `game_update` | Game lifecycle |
| Server → Client | `round_result` | End of each round |
| Server → Client | `game_ended` | Final rankings |

---

## Adding a new game

1. Create `backend/app/games/<name>/game.py` implementing `BaseGame` (`start`, `handle_action`, `get_state`)
2. Add a settings model to `backend/app/schemas/game.py` and register it in `_GAME_SETTINGS`
3. Register the class in `backend/app/games/registry.py`
4. Create `frontend/src/games/<name>/<Name>Game.tsx`
5. Add a `case` in `frontend/src/pages/Game.tsx`

---

## Production checklist

- [ ] Rotate the database password and use a least-privilege DB user (not the admin account)
- [ ] Set `JWT_SECRET` to a fresh `secrets.token_hex(32)` value
- [ ] Set `CORS_ORIGINS` to your production domain only
- [ ] Terminate TLS at a load balancer or reverse proxy (nginx with cert-manager, DigitalOcean LB, etc.)
- [ ] Inject all env vars at runtime — do not commit `.env`
