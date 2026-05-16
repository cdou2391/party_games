# Party Games Web App — Architecture Plan

## Context
Building a multiplayer party games platform from scratch. Players join as guests (with an optional path to a permanent account), enter rooms via code or public lobby browser, and play real-time games together. Tech stack: React + Vite frontend, FastAPI backend, DigitalOcean managed PostgreSQL.

---

## Project Structure

```
party_games/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router mounts
│   │   ├── config.py            # pydantic-settings (DB URL, JWT secret, etc.)
│   │   ├── database.py          # Async SQLAlchemy engine + session factory
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── game_session.py
│   │   │   └── game_player.py
│   │   ├── schemas/             # Pydantic request/response models
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   └── game.py
│   │   ├── routers/             # REST endpoints
│   │   │   ├── auth.py          # guest, register, login
│   │   │   ├── users.py         # profile, stats
│   │   │   └── lobbies.py       # create, list, join
│   │   ├── ws/
│   │   │   ├── manager.py       # ConnectionManager: rooms + broadcast
│   │   │   └── router.py        # /ws/{session_id} endpoint + event dispatch
│   │   ├── games/
│   │   │   ├── base.py          # Abstract BaseGame
│   │   │   ├── registry.py      # { "trivia": TriviaGame, "word_chain": WordChainGame }
│   │   │   ├── trivia/
│   │   │   │   ├── game.py
│   │   │   │   └── questions.json
│   │   │   └── word_chain/
│   │   │       └── game.py
│   │   └── auth/
│   │       ├── jwt.py           # encode/decode JWT
│   │       └── deps.py          # FastAPI dependencies (current_user, ws_auth)
│   ├── alembic/
│   │   └── versions/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios instance + typed API functions
│   │   ├── components/          # Reusable: PlayerCard, ScoreBoard, RoomCode, Timer
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing + quick-join
│   │   │   ├── Lobby.tsx        # Public lobby browser + create room
│   │   │   ├── Room.tsx         # Waiting room (pre-game)
│   │   │   ├── Game.tsx         # Active game wrapper (routes to game component)
│   │   │   └── Profile.tsx      # Stats, history, account upgrade
│   │   ├── games/               # Per-game UI components
│   │   │   ├── trivia/
│   │   │   └── word_chain/
│   │   ├── store/
│   │   │   ├── authStore.ts     # JWT + user info
│   │   │   └── gameStore.ts     # Live game state (from WS)
│   │   ├── hooks/
│   │   │   └── useGameSocket.ts # WS connect/disconnect + message dispatch
│   │   └── types/               # Shared TS types
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml           # Local Postgres for dev
```

---

## Database Schema (PostgreSQL)

### `users`
| column | type | notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| username | varchar(32) unique | display name |
| email | varchar nullable unique | null for guests |
| password_hash | varchar nullable | null for guests |
| is_guest | bool | true until claimed |
| avatar_seed | varchar | seed for DiceBear avatar |
| total_score | int default 0 | cumulative across games |
| games_played | int default 0 | |
| created_at | timestamptz | |

### `game_sessions`
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| game_type | varchar | "trivia" / "word_chain" |
| status | enum | waiting / in_progress / finished |
| host_id | UUID FK→users | |
| room_code | varchar(6) unique | e.g. "ABC123" |
| is_public | bool | shows in lobby browser |
| max_players | int default 8 | |
| settings | JSONB | game-specific config |
| started_at | timestamptz nullable | |
| ended_at | timestamptz nullable | |
| created_at | timestamptz | |

### `game_players`
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| session_id | UUID FK→game_sessions | |
| user_id | UUID FK→users | |
| score | int default 0 | |
| status | enum | active / disconnected / finished |
| joined_at | timestamptz | |

### `game_events` (event log)
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| session_id | UUID FK→game_sessions | |
| user_id | UUID FK nullable | null = system event |
| event_type | varchar | "join", "answer", "score_update" … |
| payload | JSONB | |
| created_at | timestamptz | |

---

## Auth Flow

- **Guest**: `POST /auth/guest` `{ username }` → JWT (guest user created in DB)
- **Register**: `POST /auth/register` `{ username, email, password }` → creates or *upgrades* guest → JWT
- **Login**: `POST /auth/login` `{ email, password }` → JWT
- **JWT payload**: `{ sub: user_id, is_guest: bool, exp }`
- Token stored in `localStorage`, sent as `Authorization: Bearer` header
- Guest → permanent upgrade: same user row updated in-place; all history preserved

---

## WebSocket Protocol

Endpoint: `WS /ws/{session_id}?token=<jwt>`

All messages: `{ "type": "...", "payload": { ... } }`

### Client → Server
| type | when |
|---|---|
| `ready` | player clicks Ready in waiting room |
| `game_action` | generic action (`{ "action": "answer", "value": "B" }`) |
| `ping` | keepalive every 30s |

### Server → Client (broadcast or targeted)
| type | when |
|---|---|
| `session_state` | on connect — full current state |
| `player_joined` / `player_left` | roster change |
| `game_started` | host starts the game |
| `game_update` | game-specific state delta |
| `score_update` | `{ scores: { player_id: score } }` |
| `game_ended` | final rankings |
| `error` | validation or server error |

---

## Game Plugin System

```python
# games/base.py
class BaseGame(ABC):
    def __init__(self, session_id: UUID, players: list[GamePlayer], settings: dict): ...

    @abstractmethod
    async def start(self) -> dict: ...           # returns initial state

    @abstractmethod
    async def handle_action(self, player_id: UUID, action: dict) -> list[dict]: ...  # returns events to broadcast

    @abstractmethod
    def get_state(self) -> dict: ...             # current state snapshot
    
    @property
    @abstractmethod
    def game_type(self) -> str: ...
```

Game instances live **in-memory** in the `ConnectionManager` (keyed by `session_id`). Only final scores and events are written to Postgres.

### Game 1: Trivia
- 10 rounds, 20s per question, 4 options (A–D)
- Score = base 100pts + speed bonus (max 50pts)
- Questions from bundled `questions.json` (shuffled per session)
- Server-side timer broadcasts `time_left` every second

### Game 2: Word Chain
- Players take turns in joined order
- Must say a word starting with the last letter of the previous word
- 10s per turn; 3 lives per player — miss = lose a life
- Last player standing wins

---

## Frontend Pages & State

### Zustand stores
- `authStore`: `{ user, token, setUser, logout, isGuest }`
- `gameStore`: `{ sessionState, scores, players, gameState, sendAction }`

### Key pages
- **Home**: guest username entry → creates guest → redirect to lobby browser
- **Lobby**: list public rooms + create room modal (game type, max players, public/private)
- **Room**: waiting room — player list, ready toggles, host starts button, room code display
- **Game**: renders `<TriviaGame>` or `<WordChainGame>` based on `session.game_type`; `ScoreBoard` overlay
- **Profile**: stats (total score, games played, win rate), recent game history, upgrade account form

---

## Local Dev Setup

`docker-compose.yml` runs a local Postgres instance mirroring DO schema.

```
# Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && pnpm dev  (proxies /api → :8000, /ws → :8000)
```

---

## Build Order (implementation phases)

1. **Scaffolding** — project folders, docker-compose, .env.example, requirements.txt, package.json
2. **DB + models** — SQLAlchemy models, Alembic migration
3. **Auth** — guest/register/login endpoints + JWT
4. **Lobbies REST** — create/list/join endpoints
5. **WS layer** — ConnectionManager, ws router, session_state on connect
6. **Game engine** — BaseGame, registry, TriviaGame
7. **Frontend core** — Vite setup, routing, authStore, API client
8. **Frontend pages** — Home → Lobby → Room → Game flow
9. **Trivia UI** — question display, answer buttons, score overlay, timer
10. **Word Chain** — game logic (backend) + UI
11. **Profile page** — stats + account upgrade
12. **Polish** — DiceBear avatars, animations, error states

---

## Verification
- Start docker-compose, run Alembic migrations, start backend
- `POST /auth/guest` → get token
- `POST /lobbies` → create room, get room_code
- `WS /ws/{session_id}?token=<jwt>` from two browser tabs → both receive `player_joined`
- Host sends `game_started` → both clients receive `game_update` with first question
- Answer from one client → `score_update` broadcast to both
