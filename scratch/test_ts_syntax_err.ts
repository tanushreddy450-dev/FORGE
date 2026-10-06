function twoSum(nums: number[], target: number) {
    this is invalid syntax
}
const testCases = [
    { id: 1, input: "[2,7,11,15]\n9" },
    { id: 2, input: "[3,2,4]\n6" },
    { id: 3, input: "[3,3]\n6" }
];
function parseArg(val: string) {
    val = val.trim();
    try { return JSON.parse(val); } catch { return val; }
}
const results = [];
for (const tc of testCases) {
    const lines = tc.input.split('\n');
    const args = lines.map(parseArg);
    const start = performance.now();
    try {
        const out = (twoSum as any)(...args);
        const duration = Math.round(performance.now() - start);
        results.push({ id: tc.id, output: out === undefined ? "undefined" : JSON.stringify(out), runtime_ms: duration, success: true });
    } catch (err: any) {
        results.push({ id: tc.id, error: String(err && err.message ? err.message : err), success: false });
    }
}
console.log('__FORGE_RESULTS__' + JSON.stringify(results));
