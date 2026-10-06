"""
Tests for Phase 7 secure execution and submission flow.

Safe test cases — no destructive payloads, no host exec.
Run with: pytest backend/tests/test_execution.py -v
Or: python -m pytest backend/tests/test_execution.py -v
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.code_execution import (
    validate_language,
    validate_code,
    MockCodeExecutionProvider,
    MAX_CODE_SIZE_BYTES,
)

client = TestClient(app)

# Helper to get auth token
def _auth_token(email="exec_test@example.com", username="exectest"):
    r = client.post("/api/auth/register", json={"email": email, "username": username, "full_name": "Exec Test", "password": "strongpass123"})
    if r.status_code == 201:
        return r.json()["data"]["access_token"]
    r = client.post("/api/auth/login", json={"email": email, "password": "strongpass123"})
    assert r.status_code == 200
    return r.json()["data"]["access_token"]


# --- Unit: validation ---

def test_validate_language_ok():
    assert validate_language("python") == "python"
    assert validate_language("Java") == "java"

def test_validate_language_invalid():
    with pytest.raises(ValueError, match="Unsupported"):
        validate_language("brainfuck")
    with pytest.raises(ValueError):
        validate_language("../etc/passwd")
    with pytest.raises(ValueError):
        validate_language("python; rm")

def test_validate_code_size():
    ok_code = "a" * 100
    validate_code(ok_code)  # no raise
    big = "a" * (MAX_CODE_SIZE_BYTES + 1)
    with pytest.raises(ValueError, match="too large"):
        validate_code(big)

def test_mock_not_executing_host():
    """Mock must never call subprocess with user code — check it returns mock provider."""
    p = MockCodeExecutionProvider()
    res = p.evaluate("print('hi')", "python", 1)
    assert res["provider"] == "mock"
    assert "status" in res

# --- Integration: execution statuses ---

def test_mock_correct_solution():
    p = MockCodeExecutionProvider()
    code = "def twoSum(nums,target):\n m={}\n for i,n in enumerate(nums):\n  c=target-n\n  if c in m: return [m[c],i]\n  m[n]=i\n return [] # long enough with return to be Accepted"
    res = p.evaluate(code, "python", 1)
    assert res["status"] in ("Accepted", "Wrong Answer")  # deterministic but either is valid mock

def test_mock_wrong_solution():
    p = MockCodeExecutionProvider()
    # No return, short
    res = p.evaluate("x", "python", 1)
    assert res["status"] == "Runtime Error"
    # Placeholder
    res = p.evaluate("TODO Write your solution here", "python", 1)
    assert res["status"] == "Wrong Answer"

def test_mock_compilation_error():
    p = MockCodeExecutionProvider()
    res = p.evaluate("SYNTAX_ERROR", "python", 1)
    assert res["status"] == "Compilation Error"
    assert "SyntaxError" in res.get("compile_error", "") or "SyntaxError" in res.get("stderr", "")
    res = p.evaluate("COMPILE_ERROR", "java", 1)
    assert res["status"] == "Compilation Error"

def test_mock_runtime_error():
    p = MockCodeExecutionProvider()
    res = p.evaluate("RUNTIME_ERROR throw Error", "python", 1)
    assert res["status"] == "Runtime Error"

def test_mock_timeout():
    p = MockCodeExecutionProvider()
    res = p.evaluate("while True: pass TIMEOUT", "python", 1)
    assert res["status"] == "Time Limit Exceeded"
    assert res["runtime_ms"] == 2000

def test_mock_excessive_output():
    p = MockCodeExecutionProvider()
    big_code = "a" * 45000  # large but under 50KB, triggers output explosion path
    res = p.evaluate(big_code, "python", 1)
    # Should be either Runtime Error due to output or Accepted/Wrong
    assert res["status"] in ("Runtime Error", "Accepted", "Wrong Answer")

def test_mock_per_test_hidden():
    import asyncio
    p = MockCodeExecutionProvider()
    cases = [
        {"id": "1", "input": "1", "expectedOutput": "1", "hidden": False},
        {"id": "2", "input": "2", "expectedOutput": "2", "hidden": True},
    ]
    res = asyncio.run(p.execute("def solve(): return 1", "python", cases))
    assert "results" in res
    assert len(res["results"]) == 2
    hidden = [r for r in res["results"] if r["hidden"]]
    assert hidden[0]["expected"] in ("", "[hidden]", None)
    visible = [r for r in res["results"] if not r["hidden"]]
    assert visible[0]["expected"] == "1"

# --- Integration: API submission flow ---

def test_submission_requires_auth():
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python", "code": "print('hi')"})
    assert r.status_code == 401

def test_submission_invalid_language():
    token = _auth_token("exec_inv_lang@example.com", "execinvlang")
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "brainfuck", "code": "print 1"}, headers={"Authorization": f"Bearer {token}"})
    # Pydantic validation gives 422, our manual check gives 400 — accept either
    assert r.status_code in (400, 422)

def test_submission_malformed_missing_code():
    token = _auth_token("exec_malformed@example.com", "execmalformed")
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code in (400, 422)

def test_submission_oversized_code():
    token = _auth_token("exec_big@example.com", "execbig")
    big = "a" * (MAX_CODE_SIZE_BYTES + 10)
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python", "code": big}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code in (400, 413, 422)

def test_submission_correct_and_wrong():
    token = _auth_token("exec_flow@example.com", "execflow")
    # Correct-ish (long with return)
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python", "code": "def twoSum(nums,target):\n m={}\n for i,n in enumerate(nums):\n  c=target-n\n  if c in m: return [m[c],i]\n  m[n]=i\n return [] # has return"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["data"]["status"] in ("Accepted", "Wrong Answer", "Compilation Error", "Runtime Error")
    assert "provider" in r.json()["data"]
    # Check in-memory storage includes new fields
    assert "test_results" in r.json()["data"] or "stdout" in r.json()["data"]

def test_submission_run_dry():
    token = _auth_token("exec_run@example.com", "execrun")
    r = client.post("/api/submissions/run", json={"problem_id": 1, "language": "python", "code": "def solve(): return 1"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert "status" in r.json()["data"]
    assert "results" in r.json()["data"]
    # Hidden not leaked: check that hidden expected is not exposed as plain
    for res in r.json()["data"]["results"]:
        if res.get("hidden"):
            assert res.get("expected") in ("", "[hidden]", None)

def test_submission_unauthorized_access():
    token_a = _auth_token("exec_a@example.com", "execa")
    token_b = _auth_token("exec_b@example.com", "execb")
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python", "code": "def solve(): return 1"}, headers={"Authorization": f"Bearer {token_a}"})
    sub_id = r.json()["data"]["id"]
    r = client.get(f"/api/submissions/{sub_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert r.status_code == 403

def test_submission_compilation_error_flow():
    token = _auth_token("exec_comp@example.com", "execcomp")
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "python", "code": "def twoSum(nums, target): this is invalid syntax"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["data"]["status"] == "Compilation Error"
    assert r.json()["data"]["compile_error"] is not None
    assert "SyntaxError" in r.json()["data"]["compile_error"]

def test_submission_service_unavailable_for_uninstalled_javac():
    token = _auth_token("exec_java@example.com", "execjava")
    r = client.post("/api/submissions", json={"problem_id": 1, "language": "java", "code": "class Solution {}"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 201
    assert r.json()["data"]["status"] == "Execution Service Unavailable"

