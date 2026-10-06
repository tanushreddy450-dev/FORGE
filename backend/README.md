# FORGE Backend — Phase 2

FastAPI + PostgreSQL + SQLAlchemy backend for the FORGE DSA learning platform.

> **Team:** Surya, Abhinaya & you — Phase 2 builds the backend foundation on top of the Phase 1 React frontend.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | FastAPI 0.115 + Uvicorn             |
| ORM          | SQLAlchemy 2.0 (Declarative)        |
| Validation   | Pydantic v2 + pydantic-settings     |
| Database     | PostgreSQL 14+ (psycopg2-binary)    |
| Migrations   | Alembic (ready, not yet required)   |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan, router wiring
│   ├── core/
│   │   ├── config.py        # Settings from env / .env (pydantic-settings)
│   │   └── exceptions.py    # Standard error envelope handlers
│   ├── db/
│   │   ├── base.py          # DeclarativeBase
│   │   └── session.py       # Engine, SessionLocal, get_db, check_db_connection
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User
│   │   ├── topic.py         # DsaTopic
│   │   ├── problem.py       # Problem
│   │   ├── submission.py    # Submission
│   │   └── progress.py      # UserProgress
│   ├── schemas/             # Pydantic request/response schemas
│   │   ├── common.py
│   │   ├── topic.py
│   │   ├── problem.py
│   │   ├── user.py
│   │   ├── submission.py
│   │   └── progress.py
│   ├── routers/             # API route modules
│   │   ├── health.py        # GET /api/health
│   │   ├── topics.py        # GET /api/topics, GET /api/topics/{id}
│   │   └── problems.py     # GET /api/problems, GET /api/problems/{id}
│   ├── services/            # Business logic (Phase 3+)
│   └── data/
│       └── seed.py          # Seed data mirroring frontend mockData.ts
├── requirements.txt
├── .env.example             # Copy to .env and fill in real values
└── README.md
```

---

## Prerequisites

- Python 3.11+ (tested on 3.13)
- PostgreSQL 14+ (optional for development — API falls back to seed data if DB is unavailable)
- `pip` or `pipx`

---

## Quick Start

### 1. Create and activate a virtual environment

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate  # macOS / Linux
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment

```powershell
Copy-Item .env.example .env
# Edit .env — at minimum set DATABASE_URL and SECRET_KEY for production
notepad .env
```

For **development without PostgreSQL** you can keep the default `DATABASE_URL` — the API will automatically serve seed data.

### 4. (Optional) Create the PostgreSQL database

```sql
-- In psql or pgAdmin
CREATE DATABASE algomaster;
-- Tables are auto-created on startup via Base.metadata.create_all().
-- For production, use Alembic migrations instead.
```

### 5. Run the API

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- API: http://localhost:8000
- Interactive docs (Swagger): http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/health

---

## Environment Variables

All settings are loaded from environment variables or a `.env` file in `backend/`. See `.env.example` for the full list.

| Variable       | Default                                                        | Description                          |
|----------------|---------------------------------------------------------------|--------------------------------------|
| `APP_NAME`     | `AlgoMaster API`                                              | App display name                     |
| `APP_ENV`      | `development`                                                 | `development` / `staging` / `production` |
| `DEBUG`        | `true`                                                        | Verbose logging                      |
| `API_PREFIX`   | `/api`                                                        | Prefix for all API routes            |
| `SECRET_KEY`   | `change-me...`                                                | **Must be changed in production**    |
| `HOST`         | `0.0.0.0`                                                     | Bind host                            |
| `PORT`         | `8000`                                                        | Bind port                            |
| `DATABASE_URL` | `postgresql+psycopg2://postgres:postgres@localhost:5432/algomaster` | SQLAlchemy database URL       |
| `CORS_ORIGINS` | `http://localhost:5173,...`                                   | Comma-separated allowed origins      |

---

## API Endpoints (Phase 2)

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/`                         | API info                             |
| GET    | `/api/health`               | Health + DB connectivity             |
| GET    | `/api/health/db`            | DB-only probe                        |
| GET    | `/api/topics`               | List topics (`?category=&search=`)   |
| GET    | `/api/topics/{id}`          | Single topic by numeric id or slug   |
| GET    | `/api/problems`             | List problems (`?difficulty=&topic_id=&search=&tag=&limit=&offset=`) |
| GET    | `/api/problems/{id}`        | Single problem by id or slug         |

All responses use the envelope `{ "success": bool, "data": ..., "total"?: int, "message"?: str }`.
Errors use `{ "success": false, "error": { "code": int, "message": str } }`.

Filtering examples:

```
GET /api/topics?category=Data%20Structures
GET /api/topics?search=graph
GET /api/problems?difficulty=Easy
GET /api/problems?topic_id=4
GET /api/problems?search=two%20sum
GET /api/problems?tag=Array&limit=5&offset=0
```

---

## Database Models

- **User** — `users` table, UUID PK, email/username unique. Prepared for JWT auth in Phase 3.
- **DsaTopic** — `dsa_topics` table, 12 seed topics. `subtopics` stored as JSONB.
- **Problem** — `problems` table, 10 seed problems. `examples`, `constraints`, `test_cases`, `tags` as JSONB, `starter_code` as Text.
- **Submission** — `submissions` table, ready for code execution in a later phase.
- **UserProgress** — `user_progress` table, per-user aggregate stats (solved counts, streak, rank).

See `app/models/*.py` for full column definitions.

---

## Frontend Integration

The React frontend (Vite, `http://localhost:5173`) is already configured. To call the API from the frontend:

```ts
const res = await fetch("http://localhost:8000/api/topics");
const { data } = await res.json();
```

CORS is pre-configured for `http://localhost:5173` and `http://localhost:3000`. Update `CORS_ORIGINS` in `.env` if your frontend runs on a different origin.

> No frontend changes are required in Phase 2. The frontend continues to use mock data; API integration is Phase 3.

---

## Alembic (Migrations) — Future

Alembic is installed but not yet initialized. When you need migrations:

```powershell
alembic init alembic
# Edit alembic.ini and alembic/env.py to use app.core.config settings
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

For Phase 2, tables are created automatically via `Base.metadata.create_all()` on startup.

---

## Testing the API

```powershell
# Health
curl http://localhost:8000/api/health

# Topics
curl http://localhost:8000/api/topics
curl http://localhost:8000/api/topics/arrays
curl "http://localhost:8000/api/topics?category=Algorithms"

# Problems
curl http://localhost:8000/api/problems
curl http://localhost:8000/api/problems/two-sum
curl "http://localhost:8000/api/problems?difficulty=Easy"
```

---

## What Comes Next (Phase 3)

- JWT authentication (register / login / me)
- Submission creation and listing
- Progress tracking endpoints
- Alembic migrations
- AI tutor and code execution services
- Frontend API wiring (replace mockData with live data)

---

## Troubleshooting

- **`could not connect to server`** — PostgreSQL is not running or `DATABASE_URL` is wrong. The API still works via seed data; check `/api/health` for `database: disconnected`.
- **`ModuleNotFoundError: app`** — Run `uvicorn` from the `backend/` directory so `app` is on the Python path.
- **CORS errors in browser** — Ensure the frontend origin is listed in `CORS_ORIGINS`.
