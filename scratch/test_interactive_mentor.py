import sys
import json
import urllib.request

def run_tests():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Test Login to get JWT
    login_data = json.dumps({"email": "demo@algomaster.com", "password": "Demo@1234"}).encode()
    req = urllib.request.Request(
        f"{base_url}/api/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    token = None
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            token = data.get("access_token") or data.get("data", {}).get("access_token")
    except Exception as e:
        print(f"Login failed: {e}")
        # Try register if not exists
        reg_data = json.dumps({"email": "test@example.com", "password": "password123", "name": "Test User"}).encode()
        rreq = urllib.request.Request(f"{base_url}/api/auth/register", data=reg_data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(rreq) as resp:
                data = json.loads(resp.read().decode())
                token = data.get("access_token") or data.get("data", {}).get("access_token")
        except Exception as e2:
            print(f"Register failed: {e2}")

    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # 2. Test /api/ai/mentor with Buggy Two Sum code
    two_sum_code = """class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        for i in range(len(nums)):
            for j in range(len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []
"""
    mentor_payload = {
        "problem_id": 1,
        "title": "Two Sum",
        "topic": "Arrays & Hashing",
        "difficulty": "Easy",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "language": "python",
        "code": two_sum_code,
        "execution_status": "Wrong Answer",
        "compile_error": "",
        "stderr": "",
        "stdout": "",
        "test_results": [
            {
                "index": 0,
                "passed": False,
                "status": "Wrong Answer",
                "hidden": False,
                "input": "nums = [2, 7, 11, 15], target = 9",
                "expected": "[0, 1]",
                "output": "[0, 0]"
            }
        ],
        "attempt_number": 1,
        "previous_hints": []
    }

    print("\n--- Testing /api/ai/mentor ---")
    mreq = urllib.request.Request(
        f"{base_url}/api/ai/mentor",
        data=json.dumps(mentor_payload).encode(),
        headers=headers
    )
    with urllib.request.urlopen(mreq) as resp:
        mres = json.loads(resp.read().decode())
        mdata = mres["data"]
        print("Success:", mres["success"])
        print("Diagnosis:", mdata.get("diagnosis"))
        print("Concept:", mdata.get("concept"))
        print("Explanation (Length:", len(mdata.get("explanation", "")), "):", mdata.get("explanation"))
        print("Interactive Question:", json.dumps(mdata.get("interactive_question"), indent=2))
        print("Code Reference:", json.dumps(mdata.get("code_reference"), indent=2))
        print("Micro Example:", json.dumps(mdata.get("micro_example"), indent=2))
        print("Has 3D Vis:", bool(mdata.get("visualization")))

        assert mdata.get("interactive_question"), "Missing interactive_question"
        assert len(mdata["interactive_question"]["options"]) >= 2, "Need at least 2 options"
        assert mdata.get("code_reference"), "Missing code_reference"
        assert mdata.get("micro_example"), "Missing micro_example"
        assert mdata.get("visualization"), "Missing visualization"
        print("\n>>> All /api/ai/mentor assertions PASSED! <<<")

        # 3. Test /api/ai/tts with the exact explanation text
        explanation_text = mdata.get("explanation")
        print("\n--- Testing /api/ai/tts with explanation text ---")
        tts_req = urllib.request.Request(
            f"{base_url}/api/ai/tts",
            data=json.dumps({"text": explanation_text, "voice": "Kore"}).encode(),
            headers=headers
        )
        with urllib.request.urlopen(tts_req) as tts_resp:
            tts_data = json.loads(tts_resp.read().decode())
            audio_b64 = tts_data["data"]["audio_base64"]
            print("TTS Success:", tts_data["success"])
            print("Audio Base64 Length:", len(audio_b64))
            print("MIME Type:", tts_data["data"]["mime_type"])
            assert len(audio_b64) > 10000, f"Audio too small ({len(audio_b64)} chars), possibly empty or fallback"
            print("\n>>> Real Audio Generation Verified! <<<")

if __name__ == "__main__":
    run_tests()
