# FORGE — Interactive DSA Learning Platform

An AI-powered interactive DSA learning platform with visual explanations, intelligent code assistance, and 3D algorithm visualization. Built by Surya, Abhinaya & team. Learn visually, practice with a sandboxed Coding Arena, and get AI-powered guidance.

**Live features:** 14 DSA topics with rich explanations + Array/Sorting visualizers + 13 problems + Monaco editor + JWT auth + mock-but-secure execution + AI Tutor (mock) + personalization.

---

## 1. Project Overview

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Monaco Editor + React Router 7 |
| Backend | FastAPI 0.115 + SQLAlchemy 2 + Pydantic 2 + PostgreSQL (psycopg2) + Alembic |
| Auth | Passlib bcrypt (12 rounds) + PyJWT HS256 |
| Execution | MockCodeExecutionProvider (Phase 7, safe) → Docker provider (Phase 8 prod) |
| AI | MockAITutorProvider → OpenAI/Anthropic via `AI_PROVIDER` env (no hard-coded keys) |

Repository: single monorepo `src/` (frontend) + `backend/app/` (backend).

## 2. Main Features

- **14 Topics:** Arrays, Strings, Linked Lists, Stacks, Queues, Hashing, Recursion, Trees, BST, Heaps, Graphs, Sorting, Searching, DP — each with concept, key ideas, operations table, complexity, code example, visualizer, and related problems
- **Visualizers:** Array (traversal/search/insert/delete) and Sorting (Bubble/Selection/Insertion) with Play/Pause/Prev/Next/Reset, step explanation, comparisons/swaps coloring — reusable `VisualizerControls`
- **Problems:** 13 problems, difficulty/topic/search filters, solved state, cards + table, detail, hints, Start Coding
- **Coding Arena:** Monaco `vs-dark`, language selector (python/java/c/cpp/typescript), Run (dry) / Submit (persist), per-test results with hidden masking, time/memory, compilation/runtime/timeout handling, responsive `flex-col md:flex-row`
- **Auth:** `POST /api/auth/register` + `login` + `GET /me`, JWT Bearer, protected `Dashboard/Topics/Problems/Arena/Profile/Leaderboard`, logout clears `localStorage`
- **AI Tutor:** 7 actions in Arena — Explain, Hint 1/2/3 (progressive), Analyze My Code, Explain Complexity, Ask Tutor (with conversation history per problem, persisted in `tutor_conversations`/`tutor_messages`)
- **Personalization:** recommendations via weak-topic heuristic (lowest solve-rate, difficulty-aware, explainable reason) + insights (`strong/weak topics`, difficulty distribution, streak/rank, next topic, suggestions) — deterministic, no LLM needed
- **Progress:** topic-wise `ProgressBar`, difficulty breakdown, recent submissions, streak, rank
- **Leaderboard:** `GET /api/leaderboard` ranked by `total_solved`

## 3. Architecture

```
src/
  components/{layout,ui,visualizers,tutor,ProtectedRoute}
  pages/{Landing,Login,Signup,Dashboard,Topics,TopicDetail,Problems,CodingArena,Profile,Leaderboard}
  lib/api.ts (central fetch, Bearer token)
  context/AuthContext.tsx (token expiry check, refresh)
  data/{mockData.ts (14/13), topicContent.ts (14 rich)}
backend/app/
  main.py (lifespan create_all, CORS, 9 routers under /api)
  core/{config.py (pydantic-settings), security.py (bcrypt/JWT), deps.py (get_current_user)}
  db/{session.py (pool), base.py}
  models/{user,topic,problem,submission (+stdout/stderr/test_results/provider), progress, tutor}
  schemas/{auth, submission (validation), tutor, ...}
  routers/{health,auth,topics,problems,submissions (+/run, /{id}), progress, leaderboard, recommendations, insights, ai}
  services/{code_execution (provider abstraction), ai_tutor, recommendations, insights, progress, leaderboard}
  data/seed.py (14 topics, 13 problems, in-memory fallback)
  docs/EXECUTION.md (sandbox)
```

Frontend ↔ Backend: `VITE_API_URL` → `http://localhost:8000` (CORS allow `localhost:5173` via `CORS_ORIGINS` env), `Authorization: Bearer <JWT>` for protected routes.

## 4. Frontend Setup

```powershell
npm install
# optional: set API URL
# .env.local: VITE_API_URL=http://localhost:8000
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build → dist/
npm run lint     # oxlint
```

Node 18+ required. No extra deps beyond `package.json`.

## 5. Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # or source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: DATABASE_URL, SECRET_KEY / JWT_SECRET_KEY
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Docs: http://localhost:8000/docs  Health: /api/health
```

Python 3.11+.

## 6. Database Setup

PostgreSQL 14+ (optional for dev — API falls back to seed/in-memory):

```sql
CREATE DATABASE algomaster;
```

Tables auto-created via `Base.metadata.create_all` on startup (see `lifespan` in `main.py`). For production use Alembic:

```powershell
alembic init alembic
# configure alembic/env.py to use app.core.config
alembic revision --autogenerate -m "init"
alembic upgrade head
```

New Phase 7 columns (`submissions.stdout/stderr/compile_error/test_results/provider`, `tutor_*`) are added via `create_all` for fresh DB; for existing DB run migration above.

Seed data: `backend/app/data/seed.py` mirrors `src/data/mockData.ts` (14 topics, 13 problems). If `DATABASE_URL` unavailable, routers fallback to seed/in-memory (`_memory_users`, `_memory_submissions`, `_memory_progress`, `_memory_conversations`).

## 7. Environment Variables

Documented in `backend/.env.example` (no real secrets committed). Root `.gitignore` and `backend/.gitignore` ignore `.env`.

```
APP_NAME, APP_ENV, DEBUG, API_PREFIX, SECRET_KEY
JWT_SECRET_KEY (>=32 chars), JWT_ALGORITHM, JWT_EXPIRE_MINUTES
HOST, PORT
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
AI_PROVIDER=mock|openai|anthropic
OPENAI_API_KEY=   # only if AI_PROVIDER=openai
ANTHROPIC_API_KEY=
SANDBOX_PROVIDER=mock|docker|judge0
DOCKER_LANGUAGES=python,java,c,cpp
```

AI/Execution keys **never** in frontend, never logged.

## 8. Running Locally

```powershell
# Terminal 1 — backend
cd backend; .venv\Scripts\Activate.ps1; uvicorn app.main:app --reload

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:5173` → Landing → Signup → Dashboard → Topics → Visualize → Problems → Arena (Run/Submit) → AI Tutor.

## 9. Running Tests

```powershell
pip install pytest
pytest backend/tests/test_execution.py -v   # 19 tests: validation, mock statuses, per-test hidden, auth, oversized, run dry, ownership, compilation
# Full audit (Phase 8) — in-memory without Postgres, ~100s
pytest backend/tests/test_execution.py -q
npx tsc -b
npm run build
```

Tests use safe markers (`SYNTAX_ERROR`, `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIMEOUT`, `while True`) — no destructive payloads, no host exec.

## 10. Code Execution Architecture

Secure by design (see `backend/docs/EXECUTION.md`):

- Validation before execution: language whitelist (`SUPPORTED_LANGUAGES`), code ≤50KB (413 else), test case cap 20, output cap 10KB
- Provider abstraction: `MockCodeExecutionProvider` (Phase 7 dev, never spawns user code, simulates compile/runtime/timeout via string markers + `sha256` deterministic) → `DockerCodeExecutionProvider` (prod, `--network none --read-only --tmpfs /tmp --memory 128m --cpus 1 --pids-limit 32 --user 65534 --cap-drop ALL`, no `DATABASE_URL`/`SECRET` passthrough, temp dir + `timeout 2s`, auto-cleanup)
- Test runner: `normalize_output` whitespace collapse, per-test `passed`/`status`, hidden `input/expected: "[hidden]"` not leaked
- Statuses: `Accepted|Wrong Answer|Compilation Error|Runtime Error|Time Limit Exceeded|Memory Limit Exceeded|Internal Error`
- Flow: `Monaco → POST /api/submissions(/run) Bearer → Pydantic → _get_problem_test_cases → executor.execute → Submission + progress → response {test_results, stdout/stderr/compile_error, runtime/memory/provider}`

In current env `SANDBOX_PROVIDER=mock` (Docker not available) — falls back safely, never executes host code.

## 11. AI Tutor Configuration

Provider-isolated (`MockAITutorProvider` → `OpenAIProvider`/`AnthropicProvider`):

- Features: Concept (beginner + example), Hint 1 (direction), Hint 2 (more specific), Hint 3 (strong guidance, no full dump), Code Mistake (why wrong + concept + fix hint), Complexity (time/space + why + optimization), Ask (NL question with history)
- All `POST /api/ai/*` require `Bearer` (401 else), user-isolated via `TutorConversation.user_id`
- Conversations persisted in `tutor_conversations`/`tutor_messages` (with in-memory fallback), `Ask` can use `conversation_id` for context
- Mock is deterministic per `problem_id`; real providers need `AI_PROVIDER` + `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` in `backend/.env` (never in frontend, never logged)

No paid key is hard-coded; `Mock` works without keys.

## 12. Deployment Considerations

- **Frontend:** `npm run build` → `dist/` static, serve via Nginx/Vercel/Netlify; set `VITE_API_URL=https://api.example.com`
- **Backend:** `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind Nginx/Gunicorn; set `APP_ENV=production`, `SECRET_KEY`/`JWT_SECRET_KEY` from vault, `DATABASE_URL` to managed Postgres, `CORS_ORIGINS=https://example.com`, `SANDBOX_PROVIDER=docker` + `DOCKER_LANGUAGES`
- **DB:** run Alembic `upgrade head` before starting; ensure `tutor_*` and new `submissions` columns exist
- **Sandbox:** host needs Docker, pull `python:3.11-slim`, `openjdk:17-slim`, `gcc:13`; ensure `--network none` and resource limits as in `EXECUTION.md`
- **Do not** deploy with `DEBUG=true` or default secrets; `backend/.env` must not be committed (gitignored)

## 13. Security Considerations

- Passwords: `passlib bcrypt` 12 rounds, never plaintext; `hashed_password` only in DB, `verify_password` on login
- JWT: `PyJWT HS256`, `exp` + `iat`, `effective_jwt_secret` from env, `HTTPBearer` 401 on missing/invalid/expired, `403` if `is_active false`, `get_current_user` checks ownership for submissions/conversations
- Input: Pydantic `SubmissionCreate` validates `language` (whitelist, no `../`), `code` size, `problem_id`; `validate_language`/`validate_code` defense-in-depth in service
- Execution: no `subprocess(shell=True)`/`eval` on user code (mock never execs), Docker `no-new-privileges`, `read-only`, `tmpfs`, `cap-drop`, no secrets in container, hidden expected not leaked, output capped
- CORS: `allow_origins = CORS_ORIGINS` env, `allow_credentials True` only for listed origins, no wildcard in prod
- Secrets: only in `backend/.env` (gitignored), never in `src/`, never in logs, `backend/.env.example` has placeholders
- Errors: `validation_exception_handler` stringifies `ctx` to avoid `ValueError not JSON serializable`; `generic_exception_handler` returns `500 Internal` without stack trace/paths

---

Team: Surya, Abhinaya & you — Phases 1-7. Phase 8 is audit/polish/deployment readiness (no Phase 9 features).
