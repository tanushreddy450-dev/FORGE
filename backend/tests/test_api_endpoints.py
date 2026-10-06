import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_and_health():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["success"] is True

    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["success"] is True
    assert "status" in r.json()["data"]


def test_demo_login():
    r = client.post("/api/auth/login", json={"email": "demo@algomaster.com", "password": "Demo@1234"})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["email"] == "demo@algomaster.com"

    token = data["data"]["access_token"]
    r_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r_me.status_code == 200
    assert r_me.json()["data"]["username"] == "demo"


def test_register_and_me():
    import uuid
    uid = uuid.uuid4().hex[:8]
    email = f"student_{uid}@example.com"
    username = f"student_{uid}"
    r = client.post("/api/auth/register", json={
        "email": email,
        "username": username,
        "full_name": "Test Student",
        "password": "Password@123",
        "college": "Test Tech",
    })
    assert r.status_code == 201
    token = r.json()["data"]["access_token"]

    r_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r_me.status_code == 200
    assert r_me.json()["data"]["email"] == email


def test_topics_endpoints():
    r = client.get("/api/topics")
    assert r.status_code == 200
    topics = r.json()["data"]
    assert len(topics) >= 14
    assert any(t["slug"] == "arrays" for t in topics)

    r_topic = client.get("/api/topics/arrays")
    assert r_topic.status_code == 200
    assert r_topic.json()["data"]["name"] == "Arrays"

    r_topic_id = client.get("/api/topics/1")
    assert r_topic_id.status_code == 200


def test_problems_endpoints():
    r = client.get("/api/problems")
    assert r.status_code == 200
    problems = r.json()["data"]
    assert len(problems) >= 10

    # Filter by difficulty
    r_easy = client.get("/api/problems?difficulty=Easy")
    assert r_easy.status_code == 200
    assert all(p["difficulty"] == "Easy" for p in r_easy.json()["data"])

    # Problem detail
    r_prob = client.get("/api/problems/two-sum")
    assert r_prob.status_code == 200
    assert r_prob.json()["data"]["title"] == "Two Sum"

    r_prob_id = client.get("/api/problems/1")
    assert r_prob_id.status_code == 200


def test_leaderboard():
    r = client.get("/api/leaderboard")
    assert r.status_code == 200
    board = r.json()["data"]
    assert isinstance(board, list)
    assert len(board) > 0
    assert board[0]["rank"] == 1


def test_authenticated_features():
    # Login as demo
    r = client.post("/api/auth/login", json={"email": "demo@algomaster.com", "password": "Demo@1234"})
    token = r.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Progress
    r_prog = client.get("/api/progress", headers=headers)
    assert r_prog.status_code == 200
    assert "total_solved" in r_prog.json()["data"]

    # Recommendations
    r_recs = client.get("/api/recommendations", headers=headers)
    assert r_recs.status_code == 200
    assert len(r_recs.json()["data"]) > 0

    # Insights
    r_ins = client.get("/api/insights", headers=headers)
    assert r_ins.status_code == 200
    assert "strong_topics" in r_ins.json()["data"]

    # Insights with recs
    r_ins_rec = client.get("/api/insights/recommendations", headers=headers)
    assert r_ins_rec.status_code == 200
    assert "insights" in r_ins_rec.json()["data"]
    assert "recommendations" in r_ins_rec.json()["data"]

    # AI Tutor concept
    r_concept = client.post("/api/ai/concept", json={"problem_id": 1, "title": "Two Sum", "topic": "Hashing"}, headers=headers)
    assert r_concept.status_code == 200
    assert "explanation" in r_concept.json()["data"]

    # AI Tutor hint
    r_hint = client.post("/api/ai/hint", json={"problem_id": 1, "hint_level": 1}, headers=headers)
    assert r_hint.status_code == 200
    assert "hint" in r_hint.json()["data"]

    # AI Tutor ask
    r_ask = client.post("/api/ai/ask", json={"problem_id": 1, "question": "What is the optimal time complexity?"}, headers=headers)
    assert r_ask.status_code == 200
    assert "answer" in r_ask.json()["data"]

    # AI Tutor conversation
    r_conv = client.post("/api/ai/conversations", json={"problem_id": 1, "title": "Test Chat"}, headers=headers)
    assert r_conv.status_code == 200
    conv_id = r_conv.json()["data"]["id"]

    r_msg = client.post(f"/api/ai/conversations/{conv_id}/messages", json={"content": "Can I use two pointers?"}, headers=headers)
    assert r_msg.status_code == 200
    assert "answer" in r_msg.json()["data"]

    # AlgoMentor with 3D Model Explainer visualization
    r_mentor = client.post(
        "/api/ai/mentor",
        json={
            "problem_id": 1,
            "title": "Two Sum",
            "topic": "Arrays & Hashing",
            "difficulty": "Easy",
            "description": "Find two numbers that add up to target.",
            "language": "python",
            "code": "def twoSum(nums, target):\n    for i in range(len(nums)):\n        for j in range(len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]",
            "execution_status": "Wrong Answer",
            "compile_error": "",
            "stderr": "",
            "stdout": "",
            "test_results": [
                {"index": 0, "passed": False, "status": "Wrong Answer", "hidden": False, "input": "[3,3], 6", "expected": "[0,1]", "output": "[0,0]"}
            ],
            "attempt_number": 1,
            "previous_hints": [],
        },
        headers=headers,
    )
    assert r_mentor.status_code == 200
    mentor_data = r_mentor.json()["data"]
    assert "diagnosis" in mentor_data
    assert "concept" in mentor_data
    assert "hint" in mentor_data
    assert mentor_data.get("has_3d_explanation") is True
    assert "visualization" in mentor_data
    vis = mentor_data["visualization"]
    assert vis is not None
    assert "steps" in vis
    assert len(vis["steps"]) > 0
    assert "array" in vis["steps"][0]
    assert "description" in vis["steps"][0]

    # Verify learning_profile returned in mentor response
    assert "learning_profile" in mentor_data
    assert mentor_data["learning_profile"] is not None
    assert "is_personalized" in mentor_data["learning_profile"]
    assert "difficulty_level" in mentor_data["learning_profile"]

    # AlgoMentor TTS endpoint
    r_tts = client.post(
        "/api/ai/tts",
        json={"text": "Review your code step by step.", "voice": "Kore"},
        headers=headers,
    )
    assert r_tts.status_code == 200
    tts_data = r_tts.json()["data"]
    assert "audio_base64" in tts_data
    assert tts_data["mime_type"] == "audio/wav"
    assert len(tts_data["audio_base64"]) > 0

    # Second call should hit in-memory cache
    r_tts_cache = client.post(
        "/api/ai/tts",
        json={"text": "Review your code step by step.", "voice": "Kore"},
        headers=headers,
    )
    assert r_tts_cache.status_code == 200
    assert r_tts_cache.json()["data"]["cached"] is True
