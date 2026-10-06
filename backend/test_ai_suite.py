import sys
from app.services.ai_tutor import interact_mentor_sync, MentorInteractRequest

tests = [
    ("AI TEST 1", "What is a Binary Search Tree?"),
    ("AI TEST 2", "Explain recursion with a real life example."),
    ("AI TEST 3", "What is the difference between stack and queue?"),
    ("AI TEST 4", "Why is binary search O(log n)?"),
    ("AI TEST 5", "Give me Python code for binary search."),
    ("AI TEST 6", "Now give the same in C++."),
    ("AI TEST 7", "Why do we use a queue in BFS?"),
    ("AI TEST 8", "Explain the current problem."),
    ("AI TEST 9", "I don't understand the topic. Explain it simply."),
    ("AI TEST 10", "Forget the current problem. Explain dynamic programming."),
]

history = []
print("=== STARTING 10 AI TESTS ===")

for tag, query in tests:
    req = MentorInteractRequest(
        problem_id=1,
        title="Binary Search",
        topic="Searching",
        difficulty="Easy",
        description="Given a sorted array of integers nums and an integer target, write a function to search target in nums.",
        code="def search(nums, target):\n    low, high = 0, len(nums) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1",
        language="python",
        action="answer_question",
        student_answer=query,
        conversation_history=history[-8:],
    )
    res = interact_mentor_sync(req)
    fb = res.get("feedback", "")
    msg = res.get("message", "")
    
    # Store in history for multi-turn testing (especially Test 5 -> Test 6)
    history.append({"role": "student", "content": query})
    history.append({"role": "tutor", "content": msg})
    
    clean_msg = msg[:140].replace("\n", " ").encode("ascii", "replace").decode()
    clean_fb = fb.encode("ascii", "replace").decode()
    print(f"[{tag}] '{query}'\n  -> Feedback: {clean_fb}\n  -> Excerpt: {clean_msg}...\n")

print("=== ALL 10 AI TESTS COMPLETED ===")
