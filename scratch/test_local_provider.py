import asyncio
import os
import sys

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.code_execution import LocalProcessCodeExecutionProvider, MockCodeExecutionProvider

async def main():
    p = LocalProcessCodeExecutionProvider()
    test_cases = [
        {"id": "1", "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]", "hidden": False},
        {"id": "2", "input": "[3,2,4]\n6", "expectedOutput": "[1,2]", "hidden": False},
        {"id": "3", "input": "[3,3]\n6", "expectedOutput": "[0,1]", "hidden": True},
    ]

    print("--- Test A: Incomplete starter code ---")
    code_a = """function twoSum(nums: number[], target: number): number[] {
    // Write your solution here
    
}"""
    res_a = await p.execute(code_a, "typescript", test_cases)
    print("Test A Status:", res_a.get("status"))
    print("Test A Results passed:", [r["passed"] for r in res_a.get("results", [])])

    print("\n--- Test B: Syntax error ---")
    code_b = """function twoSum(nums: number[], target: number) {
    this is invalid syntax
}"""
    res_b = await p.execute(code_b, "typescript", test_cases)
    print("Test B Status:", res_b.get("status"))
    print("Test B Compile Error:", res_b.get("compile_error"))

    print("\n--- Test C: Wrong logic ---")
    code_c = """function twoSum(nums: number[], target: number): number[] {
    return [];
}"""
    res_c = await p.execute(code_c, "typescript", test_cases)
    print("Test C Status:", res_c.get("status"))
    print("Test C Results passed:", [r["passed"] for r in res_c.get("results", [])])

    print("\n--- Test D: Correct solution ---")
    code_d = """function twoSum(nums: number[], target: number): number[] {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (map.has(diff)) return [map.get(diff)!, i];
        map.set(nums[i], i);
    }
    return [];
}"""
    res_d = await p.execute(code_d, "typescript", test_cases)
    print("Test D Status:", res_d.get("status"))
    print("Test D Results passed:", [r["passed"] for r in res_d.get("results", [])])

    print("\n================ Python Tests ================")
    py_incomplete = "def twoSum(nums, target):\n    pass"
    py_res_a = await p.execute(py_incomplete, "python", test_cases)
    print("Python Incomplete Status:", py_res_a.get("status"))
    print("Python Incomplete Results passed:", [r["passed"] for r in py_res_a.get("results", [])])

    py_syntax = "def twoSum(nums, target): this is invalid syntax"
    py_res_b = await p.execute(py_syntax, "python", test_cases)
    print("Python Syntax Status:", py_res_b.get("status"))
    print("Python Syntax Error:", py_res_b.get("compile_error"))

    py_wrong = "def twoSum(nums, target):\n    return []"
    py_res_c = await p.execute(py_wrong, "python", test_cases)
    print("Python Wrong Status:", py_res_c.get("status"))
    print("Python Wrong Results passed:", [r["passed"] for r in py_res_c.get("results", [])])

    py_correct = """def twoSum(nums, target):
    m = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in m:
            return [m[diff], i]
        m[n] = i
    return []"""
    py_res_d = await p.execute(py_correct, "python", test_cases)
    print("Python Correct Status:", py_res_d.get("status"))
    print("Python Correct Results passed:", [r["passed"] for r in py_res_d.get("results", [])])

    print("\n================ Java Test (javac unavailable) ================")
    java_res = await p.execute("class Solution {}", "java", test_cases)
    print("Java Status:", java_res.get("status"))
    print("Java Error Message:", java_res.get("error_message"))

if __name__ == "__main__":
    # Add backend to sys.path
    backend_path = os.path.abspath(r"c:\Users\tanus\OneDrive\Desktop\FORGE_DSA\backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    asyncio.run(main())
