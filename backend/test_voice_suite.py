from app.services.ai_tutor import generate_speech_sync

test_texts = [
    "A Binary Search Tree maintains smaller keys in the left child and larger keys in the right child.",
    "In BFS, a queue ensures we visit all vertices at distance d before moving to distance d plus one.",
    "Dynamic programming solves problems by caching solutions to overlapping subproblems."
]

print("=== STARTING 3 VOICE TESTS ===")
for i, text in enumerate(test_texts, 1):
    res = generate_speech_sync(text, "tara")
    prov = res.get("provider")
    model = res.get("model")
    mime = res.get("mime_type")
    b64_len = len(res.get("audio_base64", ""))
    cached = res.get("cached")
    print(f"Voice Test {i}:")
    print(f"  Input: {text}")
    print(f"  Provider: {prov}, Model: {model}, MIME: {mime}, AudioBase64: {b64_len} chars, Cached: {cached}\n")

print("=== ALL 3 VOICE TESTS COMPLETED ===")
