import json, sys, time

def twoSum(nums, target):
    m = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in m:
            return [m[diff], i]
        m[n] = i
    return []

test_cases = [
    {"id": 1, "input": "[2,7,11,15]\n9"},
    {"id": 2, "input": "[3,2,4]\n6"},
    {"id": 3, "input": "[3,3]\n6"}
]

def parse_arg(line):
    line = line.strip()
    try:
        return json.loads(line)
    except Exception:
        return line

results = []
for tc in test_cases:
    lines = tc["input"].strip().split("\n")
    args = [parse_arg(l) for l in lines]
    t0 = time.perf_counter()
    try:
        out = twoSum(*args)
        duration = int((time.perf_counter() - t0) * 1000)
        results.append({"id": tc["id"], "output": json.dumps(out), "runtime_ms": duration, "success": True})
    except Exception as e:
        results.append({"id": tc["id"], "error": str(e), "success": False})

print("__FORGE_RESULTS__" + json.dumps(results))
