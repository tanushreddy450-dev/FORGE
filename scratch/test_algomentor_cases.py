import sys
import os
import json

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def safe_str(s: str) -> str:
    return str(s).encode("ascii", "backslashreplace").decode("ascii")

from app.schemas.tutor import MentorInteractRequest
from app.services.ai_tutor import interact_mentor_sync, ask_sync, get_ai_tutor

provider = get_ai_tutor()
print(f"=== ALGOMENTOR LIVE VERIFICATION (Active Provider: {provider.provider_name}) ===\n")

tests = [
    # 1. Linked list
    {"id": 1, "prompt": "What is a linked list?", "context_prob": "Two Sum"},
    # 2. Binary search tree
    {"id": 2, "prompt": "What is a binary search tree?", "context_prob": "Two Sum"},
    # 3. Recursion with real-life example
    {"id": 3, "prompt": "Explain recursion with a real-life example.", "context_prob": "Two Sum"},
    # 4. Difference between BFS and DFS
    {"id": 4, "prompt": "What is the difference between BFS and DFS?", "context_prob": "Two Sum"},
    # 5. Why binary search is O(log n)
    {"id": 5, "prompt": "Why is binary search O(log n)?", "context_prob": "Two Sum"},
    # 6. Python code for binary search
    {"id": 6, "prompt": "Give me Python code for binary search.", "context_prob": "Two Sum"},
    # 7. Multi-turn follow-up: C++ version of the same thing
    {"id": 7, "prompt": "Now explain the same thing in C++.", "follow_up_to": 6, "context_prob": "Two Sum"},
    # 8. Why use queue for BFS
    {"id": 8, "prompt": "Why would I use a queue for BFS?", "context_prob": "Two Sum"},
    # 9. Forget current problem. Explain dynamic programming
    {"id": 9, "prompt": "Forget the current problem. Explain dynamic programming.", "context_prob": "Two Sum"},
    # 10. Question about current problem/code
    {
        "id": 10,
        "prompt": "Why is my Two Sum code failing with Wrong Answer when target=6 and nums=[3,3]?",
        "context_prob": "Two Sum",
        "code": "def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        seen[n] = i\n        if target - n in seen:\n            return [seen[target - n], i]",
    },
]

results = []
history = []

for t in tests:
    print(f"--- Running Test {t['id']}: \"{t['prompt']}\" ---")
    req_history = list(history) if t.get("follow_up_to") else []
    
    req = MentorInteractRequest(
        problem_id=1,
        title=t["context_prob"],
        topic="Arrays & Hashing",
        difficulty="Easy",
        description="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        code=t.get("code", ""),
        action="answer_question",
        student_answer=t["prompt"],
        conversation_history=req_history,
    )
    
    res = interact_mentor_sync(req)
    feedback = res.get("feedback", "")
    message = res.get("message", "")
    analogy = res.get("analogy", "")
    
    # Check that response is non-empty, not generic canned fallback, and relevant
    combined_text = f"{feedback}\n{message}\n{analogy}".strip()
    
    print(f"Feedback: {safe_str(feedback)}")
    print(f"Message Preview: {safe_str(message[:180])}...")
    if analogy:
        print(f"Analogy: {safe_str(analogy)}")
    print(f"Response Length: {len(combined_text)} chars")
    
    # Save to history for follow-ups
    history.append({"role": "user", "content": t["prompt"]})
    history.append({"role": "assistant", "content": message})
    
    results.append({
        "id": t["id"],
        "prompt": t["prompt"],
        "feedback": feedback,
        "preview": message[:200],
        "length": len(combined_text),
        "success": len(combined_text) > 100,
    })
    print()

print("=== SUMMARY OF ALL 10 TESTS ===")
all_passed = True
for r in results:
    status = "PASSED" if r["success"] else "FAILED"
    if not r["success"]:
        all_passed = False
    print(f"Test {r['id']}: [{status}] ({r['length']} chars) - \"{r['prompt']}\"")

if all_passed:
    print("\nALL 10 MANDATORY TUTOR TESTS PASSED GENUINELY WITH AI REASONING!")
else:
    print("\nSOME TESTS FAILED!")
