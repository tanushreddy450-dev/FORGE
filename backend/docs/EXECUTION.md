# Code Execution — Secure Sandbox Architecture (Phase 7)

This document describes how student code is executed safely for FORGE.

## Security Principle

**Never execute arbitrary student code directly on the host.** All execution must go through an isolated sandbox.

## Provider Architecture

```
Frontend (Monaco) 
  ↓ Bearer JWT
Authenticated API (FastAPI) — validates language, code size, problem_id
  ↓
Submission validation (Pydantic: language whitelist, 50KB code limit)
  ↓
CodeExecutionProvider (abstract)
  ├─ MockCodeExecutionProvider  (Phase 7 dev, safe, no host exec)
  ├─ DockerCodeExecutionProvider (Phase 7 prod, requires Docker images)
  └─ Judge0CodeExecutionProvider (future)
  ↓
Test Runner (per-test comparison, whitespace normalization, hidden handling)
  ↓
Result processing → Database (submissions) → Frontend
```

Only `Mock` is active in the current environment. `Docker` is documented below and auto-selected when `SANDBOX_PROVIDER=docker` and `docker` binary is available.

## Limits Enforced (Before Any Execution)

- **Language**: whitelist `python, java, c, cpp, typescript, javascript` (production only enables `python,java,c,cpp` via `DOCKER_LANGUAGES`)
- **Code size**: 50 KB (`MAX_CODE_SIZE_BYTES`) — 413 if exceeded
- **Output size**: 10 KB (`MAX_OUTPUT_SIZE_BYTES`) — truncated with `…[truncated]`
- **Test cases**: max 20 per execution
- **Time**: 2000 ms default (`DEFAULT_TIME_LIMIT_MS`)
- **Memory**: 128 MB (`DEFAULT_MEMORY_LIMIT_KB`)
- **Path traversal / shell injection**: `language` must match `^[a-z0-9_+\-#]+$`, code checked for suspicious `os.environ`/`DATABASE_URL` patterns (log only, sandbox enforces isolation)

## Mock Provider (Phase 7 Dev)

- **No subprocess, no filesystem, no network, no env passthrough**
- Simulates:
  - Compilation Error (Java missing `class`, mismatched braces, `SYNTAX_ERROR`/`COMPILE_ERROR` markers)
  - Runtime Error (`RUNTIME_ERROR`, `Code too short`)
  - Time Limit (`TIMEOUT`/`while True`)
  - Wrong Answer vs Accepted via deterministic hash of code (`sha256`)
- Per-test results: `passed` true for Accepted, else 50% pass via `hash(code+idx) %2`; hidden tests return `input:"[hidden]"`, `expected:"[hidden]"` to avoid leakage.

## Docker Provider (Production)

When `SANDBOX_PROVIDER=docker` and `docker` is on PATH, `DockerCodeExecutionProvider` is selected.

**Required images** (pull before enabling):

```bash
docker pull python:3.11-slim
docker pull openjdk:17-slim
docker pull gcc:13
```

**Required `docker run` flags** (enforced by provider, not by caller):

```
--network none
--read-only
--tmpfs /tmp:exec,size=64m
--memory 128m --memory-swap 128m
--cpus 1
--pids-limit 32
--user 65534:65534
--cap-drop ALL
--security-opt no-new-privileges
-e PYTHONUNBUFFERED=1
# No -e DATABASE_URL, -e SECRET_KEY, -e JWT_SECRET — never pass app secrets
--workdir /tmp
--rm
```

**Per-execution lifecycle:**

1. Create temp dir `mkdtemp(/tmp/algomaster-XXXX)` on host, write `solution.<ext>` (no secrets in file path)
2. `docker run` with above flags, mount temp dir read-only or copy file in, execute via `timeout 2s` + language-specific compile/run
3. Capture stdout/stderr via host pipe, enforce 10KB output cap (kill if exceed)
4. Remove temp dir (`shutil.rmtree`) even on error/timeout (try/finally)
5. Never log raw student code at INFO; only at DEBUG with truncation

**Language commands (inside container):**

- `python`: `python3 -c "import ast; ast.parse(open('/tmp/solution.py').read())" && timeout 2s python3 /tmp/solution.py < input.txt`
- `java`: `javac -d /tmp /tmp/Solution.java && timeout 2s java -cp /tmp Solution`
- `c`: `gcc -O2 -o /tmp/a.out /tmp/solution.c && timeout 2s /tmp/a.out`
- `cpp`: `g++ -O2 -std=c++17 -o /tmp/a.out /tmp/solution.cpp && timeout 2s /tmp/a.out`

If compile fails, return `Compilation Error` with `compile_error` from `stderr` (capped).

## Hidden Test Cases

- `test_cases` where `hidden:true` are executed but response hides `input`/`expected` (`"[hidden]"`) and only returns `passed`/`status`
- Problem detail endpoint still returns hidden `expectedOutput` for legacy, but execution results never leak hidden expected via `test_results` when using Docker (mock also hides)

## Configuration

Env vars (never hard-coded, never committed):

```
SANDBOX_PROVIDER=mock        # mock | docker | judge0
DOCKER_LANGUAGES=python,java,c,cpp
# Never set in container: DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY, OPENAI_API_KEY
```

See `backend/.env.example`.

## Limitations in Current Environment (Phase 7)

- Docker not available in this dev container, so `Mock` is active. To enable real sandbox:
  1. Install Docker, pull images above
  2. Set `SANDBOX_PROVIDER=docker` in `backend/.env`
  3. Restart `uvicorn`
  4. Verify `GET /api/health` shows `provider: docker` in execution results

## Security Audit Checklist (Phase 7)

- [x] No `os.system`, `subprocess` with `shell=True`, or `eval` on user code
- [x] Language validated against whitelist, reject `../`, `/`, `\`, shell chars
- [x] Code size limited before execution
- [x] Provider never receives `DATABASE_URL`/`SECRET_KEY`/`JWT_SECRET` env
- [x] Output size capped, test case count capped
- [x] Hidden test case expected not exposed in `test_results` for hidden
- [x] Submission endpoints require `Bearer` JWT (`get_current_user`), user can only access own submissions
- [x] Frontend never bypasses backend validation (all via `POST /api/submissions` / `/run`)
- [x] Temporary working directory auto-cleanup
- [x] Mock never logs raw code at INFO

Future Phase 8: add container-level seccomp/AppArmor, cgroup v2, and Judge0 integration.
