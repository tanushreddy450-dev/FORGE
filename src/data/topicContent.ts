import type { TopicLearningContent } from "@/types";

export const topicContents: Record<string, TopicLearningContent> = {
  arrays: {
    slug: "arrays",
    concept:
      "An array is a contiguous block of memory that stores elements of the same type. Each element is accessed by an index, giving O(1) random access. Arrays are the foundation for most other data structures.",
    keyIdeas: [
      "Contiguous memory — elements sit next to each other for cache efficiency",
      "Zero-based indexing — first element is at index 0",
      "Fixed size in low-level languages; dynamic arrays (Java ArrayList, Python list) grow by resizing",
      "O(1) access by index, O(n) insertion/deletion in the middle",
    ],
    operations: [
      { name: "Access arr[i]", description: "Direct index lookup", time: "O(1)", space: "O(1)" },
      { name: "Traverse", description: "Visit every element once", time: "O(n)", space: "O(1)" },
      { name: "Search (unsorted)", description: "Linear scan", time: "O(n)", space: "O(1)" },
      { name: "Search (sorted)", description: "Binary search", time: "O(log n)", space: "O(1)" },
      { name: "Insert at end", description: "Append (amortized for dynamic arrays)", time: "O(1)", space: "O(1)" },
      { name: "Insert at i", description: "Shift elements right", time: "O(n)", space: "O(1)" },
      { name: "Delete at i", description: "Shift elements left", time: "O(n)", space: "O(1)" },
    ],
    complexity: { time: "O(1) access, O(n) insert/delete", space: "O(n)", note: "Dynamic arrays double capacity when full — amortized O(1) append." },
    codeExample: {
      language: "typescript",
      code: `// Find max in array — O(n)\nfunction findMax(arr: number[]): number {\n  let max = arr[0];\n  for (let i = 1; i < arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}`,
      explanation: "Single traversal keeps the current maximum. No extra space beyond a variable.",
    },
    visualType: "array",
  },
  strings: {
    slug: "strings",
    concept:
      "A string is an immutable sequence of characters. In most languages strings are backed by an array of characters, but their immutability means many operations create new strings.",
    keyIdeas: [
      "Immutability — every modification creates a new string",
      "Indexing works like arrays, but slicing often copies",
      "Common patterns: two pointers, sliding window, hashing",
      "Unicode and encoding matter for real-world text",
    ],
    operations: [
      { name: "Access s[i]", description: "Character at index", time: "O(1)", space: "O(1)" },
      { name: "Substring s[l..r]", description: "Extract slice (may copy)", time: "O(k)", space: "O(k)" },
      { name: "Concatenate", description: "s1 + s2", time: "O(n+m)", space: "O(n+m)" },
      { name: "Search", description: "KMP / Rabin-Karp for pattern matching", time: "O(n+m)", space: "O(m)" },
      { name: "Split / Join", description: "Tokenize or rebuild", time: "O(n)", space: "O(n)" },
    ],
    complexity: { time: "O(1) char access, O(n) substring", space: "O(n)", note: "Use StringBuilder / join for many concatenations." },
    codeExample: {
      language: "typescript",
      code: `// Check anagram with frequency map — O(n)\nfunction isAnagram(s: string, t: string): boolean {\n  if (s.length !== t.length) return false;\n  const freq = new Map<string, number>();\n  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);\n  for (const ch of t) {\n    if (!freq.has(ch)) return false;\n    freq.set(ch, freq.get(ch)! - 1);\n    if (freq.get(ch)! < 0) return false;\n  }\n  return true;\n}`,
      explanation: "Count characters of s, then decrement with t. Hash map gives O(1) average per char.",
    },
    visualType: "array",
  },
  "linked-lists": {
    slug: "linked-lists",
    concept:
      "A linked list is a chain of nodes where each node stores data and a pointer to the next node. Unlike arrays, insertion and deletion are O(1) once the node is found, but access is O(n).",
    keyIdeas: [
      "Non-contiguous memory — nodes can be anywhere",
      "Singly vs doubly linked — one vs two pointers per node",
      "No random access — must walk from head",
      "Fast & slow pointers solve cycle and middle problems",
    ],
    operations: [
      { name: "Access kth", description: "Walk from head", time: "O(n)", space: "O(1)" },
      { name: "Insert at head", description: "New node points to old head", time: "O(1)", space: "O(1)" },
      { name: "Insert at tail", description: "With tail pointer", time: "O(1)", space: "O(1)" },
      { name: "Delete node", description: "Bypass pointer", time: "O(1)", space: "O(1)" },
      { name: "Reverse", description: "Flip pointers iteratively", time: "O(n)", space: "O(1)" },
    ],
    complexity: { time: "O(n) access, O(1) insert/delete", space: "O(n)", note: "Doubly linked lists add O(1) delete from tail but double pointers." },
    codeExample: {
      language: "typescript",
      code: `class ListNode { constructor(public val: number, public next: ListNode|null=null) {} }\n// Reverse iteratively — O(n)\nfunction reverseList(head: ListNode|null): ListNode|null {\n  let prev: ListNode|null = null;\n  let curr = head;\n  while (curr) { const nxt = curr.next; curr.next = prev; prev = curr; curr = nxt; }\n  return prev;\n}`,
      explanation: "Keep prev and curr, save next, flip link, advance.",
    },
    visualType: "none",
  },
  stacks: {
    slug: "stacks",
    concept:
      "A stack is a Last-In-First-Out (LIFO) collection. Only the top element is accessible. Think of a stack of plates — you push onto the top and pop from the top.",
    keyIdeas: [
      "LIFO — last pushed is first popped",
      "Implemented with array or linked list",
      "Fundamental for recursion, undo, and parsing",
      "Monotonic stack solves next-greater-element in O(n)",
    ],
    operations: [
      { name: "Push", description: "Add to top", time: "O(1)", space: "O(1)" },
      { name: "Pop", description: "Remove top", time: "O(1)", space: "O(1)" },
      { name: "Peek / Top", description: "Read top without removing", time: "O(1)", space: "O(1)" },
      { name: "isEmpty", description: "Check if empty", time: "O(1)", space: "O(1)" },
    ],
    complexity: { time: "O(1) all ops", space: "O(n)", note: "Array implementation may resize; linked list never wastes capacity." },
    codeExample: {
      language: "typescript",
      code: `function isValid(s: string): boolean {\n  const stack: string[] = [];\n  const pairs: Record<string,string> = {')':'(', ']':'[', '}':'{'};\n  for (const ch of s) {\n    if ('([{'.includes(ch)) stack.push(ch);\n    else if (stack.pop() !== pairs[ch]) return false;\n  }\n  return stack.length === 0;\n}`,
      explanation: "Push opens, pop and compare for closes. Stack ensures last opened is first closed.",
    },
    visualType: "none",
  },
  queues: {
    slug: "queues",
    concept:
      "A queue is a First-In-First-Out (FIFO) collection. Elements enter at the rear and leave from the front, like a line at a store.",
    keyIdeas: [
      "FIFO — first enqueued is first dequeued",
      "Circular buffer avoids O(n) shifts",
      "Deque allows both ends in O(1)",
      "BFS uses a queue to explore level by level",
    ],
    operations: [
      { name: "Enqueue", description: "Add to rear", time: "O(1)", space: "O(1)" },
      { name: "Dequeue", description: "Remove from front", time: "O(1)", space: "O(1)" },
      { name: "Front / Peek", description: "Read front", time: "O(1)", space: "O(1)" },
      { name: "isEmpty", description: "Check empty", time: "O(1)", space: "O(1)" },
    ],
    complexity: { time: "O(1) all ops", space: "O(n)", note: "Naive array shift is O(n); use deque or circular array." },
    codeExample: {
      language: "typescript",
      code: `// BFS with queue — O(V+E)\nfunction bfs(graph: Map<number, number[]>, start: number) {\n  const queue: number[] = [start];\n  const visited = new Set([start]);\n  while (queue.length) {\n    const node = queue.shift()!;\n    for (const nei of graph.get(node) ?? []) if (!visited.has(nei)) { visited.add(nei); queue.push(nei); }\n  }\n}`,
      explanation: "Queue processes nodes in discovery order, guaranteeing level order.",
    },
    visualType: "none",
  },
  hashing: {
    slug: "hashing",
    concept:
      "Hashing maps keys to indices via a hash function, giving average O(1) lookup. Collisions are handled by chaining or open addressing.",
    keyIdeas: [
      "Hash function should distribute uniformly",
      "Load factor = n/m — keep below 0.7-0.75",
      "Chaining uses buckets with linked lists",
      "Perfect hashing achieves O(1) worst case",
    ],
    operations: [
      { name: "Insert", description: "Hash and place", time: "O(1) avg, O(n) worst", space: "O(1)" },
      { name: "Search", description: "Hash and probe bucket", time: "O(1) avg", space: "O(1)" },
      { name: "Delete", description: "Remove from bucket", time: "O(1) avg", space: "O(1)" },
    ],
    complexity: { time: "O(1) average, O(n) worst", space: "O(n)", note: "Worst case when all keys collide; good hash avoids this." },
    codeExample: {
      language: "typescript",
      code: `// Two Sum with hash map — O(n)\nfunction twoSum(nums: number[], target: number): number[] {\n  const map = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (map.has(need)) return [map.get(need)!, i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
      explanation: "Store each number's index as you go; complement lookup is O(1).",
    },
    visualType: "none",
  },
  recursion: {
    slug: "recursion",
    concept:
      "Recursion solves a problem by solving smaller instances of itself. A recursive function has a base case and a recursive case, using the call stack for state.",
    keyIdeas: [
      "Base case stops recursion; without it you get stack overflow",
      "Each call gets its own frame on the call stack",
      "Recursion often maps cleanly to trees and divide-and-conquer",
      "Memoization caches results to avoid exponential recomputation",
    ],
    operations: [
      { name: "Factorial", description: "n * factorial(n-1)", time: "O(n)", space: "O(n)" },
      { name: "Tree traversal", description: "Visit node + recurse children", time: "O(n)", space: "O(h)" },
      { name: "Backtracking", description: "Try, recurse, undo", time: "O(branch^depth)", space: "O(depth)" },
    ],
    complexity: { time: "Depends on recurrence", space: "O(depth) call stack", note: "Tail recursion can be optimized to O(1) space in some languages." },
    codeExample: {
      language: "typescript",
      code: `// Fibonacci with memoization — O(n)\nfunction fib(n: number, memo = new Map<number,number>()): number {\n  if (n <= 1) return n;\n  if (memo.has(n)) return memo.get(n)!;\n  const res = fib(n-1, memo) + fib(n-2, memo);\n  memo.set(n, res);\n  return res;\n}`,
      explanation: "Without memo, fib is O(2^n). Caching makes it linear.",
    },
    visualType: "none",
  },
  trees: {
    slug: "trees",
    concept:
      "A tree is a hierarchical structure with a root, branches, and leaves. Each node has at most one parent. Trees model hierarchies and enable O(log n) operations when balanced.",
    keyIdeas: [
      "Root, child, parent, leaf, depth, height, subtree",
      "Binary tree: at most 2 children per node",
      "Traversals: inorder, preorder, postorder, level order",
      "Balanced trees (AVL, Red-Black) guarantee O(log n)",
    ],
    operations: [
      { name: "Traverse (DFS/BFS)", description: "Visit all nodes", time: "O(n)", space: "O(h)" },
      { name: "Search (BST)", description: "Left < root < right", time: "O(h)", space: "O(h)" },
      { name: "Insert (BST)", description: "Find position and add leaf", time: "O(h)", space: "O(h)" },
      { name: "LCA", description: "Lowest common ancestor", time: "O(n)", space: "O(h)" },
    ],
    complexity: { time: "O(n) traverse, O(h) BST ops", space: "O(h)", note: "h = height. Balanced h = log n, skewed h = n." },
    codeExample: {
      language: "typescript",
      code: `// Inorder traversal — O(n)\nfunction inorder(root: TreeNode|null, res: number[] = []): number[] {\n  if (!root) return res;\n  inorder(root.left, res);\n  res.push(root.val);\n  inorder(root.right, res);\n  return res;\n}`,
      explanation: "Recursively visit left, node, right. For BST this yields sorted order.",
    },
    visualType: "none",
  },
  "binary-search-trees": {
    slug: "binary-search-trees",
    concept:
      "A Binary Search Tree (BST) is a binary tree where left subtree < node < right subtree. This ordering enables efficient search, insert, and delete when the tree stays balanced.",
    keyIdeas: [
      "BST property must hold for every subtree",
      "Inorder traversal of BST is sorted",
      "Unbalanced BST degrades to linked list — need AVL/Red-Black",
      "Successor / predecessor are ordered neighbors",
    ],
    operations: [
      { name: "Search", description: "Compare and go left/right", time: "O(h)", space: "O(h)" },
      { name: "Insert", description: "Find null spot and attach", time: "O(h)", space: "O(h)" },
      { name: "Delete", description: "Replace with successor", time: "O(h)", space: "O(h)" },
      { name: "Validate", description: "Check BST property bounds", time: "O(n)", space: "O(h)" },
    ],
    complexity: { time: "O(log n) balanced, O(n) skewed", space: "O(h)", note: "Self-balancing trees keep h = O(log n) worst case." },
    codeExample: {
      language: "typescript",
      code: `function isValidBST(root: TreeNode|null, lo=-Infinity, hi=Infinity): boolean {\n  if (!root) return true;\n  if (root.val <= lo || root.val >= hi) return false;\n  return isValidBST(root.left, lo, root.val) && isValidBST(root.right, root.val, hi);\n}`,
      explanation: "Pass down allowed range; each node must be within (lo, hi).",
    },
    visualType: "none",
  },
  heaps: {
    slug: "heaps",
    concept:
      "A heap is a complete binary tree satisfying heap property: parent >= children (max-heap) or parent <= children (min-heap). Heaps are implemented as arrays and power priority queues.",
    keyIdeas: [
      "Complete tree — filled left to right, array representation with parent at i//2",
      "Heapify up/down restores property after insert/delete",
      "Priority queue: O(log n) push/pop, O(1) peek",
      "Heap sort is O(n log n) in-place",
    ],
    operations: [
      { name: "Peek (min/max)", description: "Root element", time: "O(1)", space: "O(1)" },
      { name: "Push", description: "Add at end and sift up", time: "O(log n)", space: "O(1)" },
      { name: "Pop", description: "Remove root and sift down", time: "O(log n)", space: "O(1)" },
      { name: "Heapify", description: "Build heap from array", time: "O(n)", space: "O(1)" },
    ],
    complexity: { time: "O(log n) push/pop, O(1) peek", space: "O(n)", note: "Array index math: left=2*i, right=2*i+1, parent=floor(i/2)." },
    codeExample: {
      language: "typescript",
      code: `// Top K with min-heap — O(n log k)\nfunction topK(nums: number[], k: number): number[] {\n  const heap: number[] = [];\n  // push/pop with sift logic omitted for brevity\n  // keep heap size k, smallest at root\n  return heap.sort((a,b)=>b-a);\n}`,
      explanation: "Keep k largest in a min-heap; evict smallest when full.",
    },
    visualType: "none",
  },
  graphs: {
    slug: "graphs",
    concept:
      "A graph is a set of vertices connected by edges. Edges can be directed or undirected, weighted or unweighted. Graphs model networks, maps, and relationships.",
    keyIdeas: [
      "Representation: adjacency list (sparse) vs matrix (dense)",
      "BFS uses queue for shortest path in unweighted graphs",
      "DFS uses stack/recursion for connectivity and topological sort",
      "Dijkstra needs priority queue for weighted shortest path",
    ],
    operations: [
      { name: "BFS", description: "Level order with queue", time: "O(V+E)", space: "O(V)" },
      { name: "DFS", description: "Depth first with stack/recursion", time: "O(V+E)", space: "O(V)" },
      { name: "Dijkstra", description: "Shortest path with heap", time: "O((V+E) log V)", space: "O(V)" },
      { name: "Topological Sort", description: "Kahn or DFS", time: "O(V+E)", space: "O(V)" },
    ],
    complexity: { time: "O(V+E) traversal", space: "O(V)", note: "Adjacency list is preferred for sparse graphs." },
    codeExample: {
      language: "typescript",
      code: `// DFS recursive — O(V+E)\nfunction dfs(graph: Map<number, number[]>, node: number, visited = new Set<number>()) {\n  visited.add(node);\n  for (const nei of graph.get(node) ?? []) if (!visited.has(nei)) dfs(graph, nei, visited);\n}`,
      explanation: "Mark visited, recurse to neighbors. Stack depth = recursion depth.",
    },
    visualType: "none",
  },
  sorting: {
    slug: "sorting",
    concept:
      "Sorting arranges elements in order. Comparison sorts need at least O(n log n) comparisons. Studying sorting builds intuition for divide-and-conquer and stability.",
    keyIdeas: [
      "Stable sort keeps equal elements in original order",
      "In-place sorts use O(1) extra space",
      "Divide-and-conquer (merge/quick) vs incremental (insertion/selection)",
      "Counting sort is O(n+k) but only for integers in range",
    ],
    operations: [
      { name: "Bubble Sort", description: "Swap adjacent if out of order", time: "O(n²)", space: "O(1)" },
      { name: "Selection Sort", description: "Pick min and swap to front", time: "O(n²)", space: "O(1)" },
      { name: "Insertion Sort", description: "Build sorted prefix", time: "O(n²)", space: "O(1)" },
      { name: "Merge Sort", description: "Divide, sort halves, merge", time: "O(n log n)", space: "O(n)" },
    ],
    complexity: { time: "O(n log n) optimal for comparison", space: "O(1) to O(n)", note: "Insertion sort is O(n) on nearly sorted data." },
    codeExample: {
      language: "typescript",
      code: `// Insertion sort — O(n²) worst, O(n) best\nfunction insertionSort(arr: number[]) {\n  for (let i = 1; i < arr.length; i++) {\n    const key = arr[i]; let j = i - 1;\n    while (j >= 0 && arr[j] > key) { arr[j+1] = arr[j]; j--; }\n    arr[j+1] = key;\n  }\n}`,
      explanation: "Insert each element into already sorted prefix by shifting.",
    },
    visualType: "sorting",
  },
  searching: {
    slug: "searching",
    concept:
      "Searching finds an element or confirms absence. The choice depends on whether data is sorted and how it is stored.",
    keyIdeas: [
      "Linear search works on anything: O(n)",
      "Binary search needs sorted array: O(log n)",
      "Hash table gives O(1) average but unordered",
      "Interpolation and exponential search optimize for distributions",
    ],
    operations: [
      { name: "Linear Search", description: "Scan each element", time: "O(n)", space: "O(1)" },
      { name: "Binary Search", description: "Halve search space", time: "O(log n)", space: "O(1)" },
      { name: "Ternary Search", description: "Split into thirds", time: "O(log₃ n)", space: "O(1)" },
      { name: "Hash Search", description: "Hash table lookup", time: "O(1) avg", space: "O(n)" },
    ],
    complexity: { time: "O(n) unsorted, O(log n) sorted", space: "O(1)", note: "Binary search requires random access and sorted data." },
    codeExample: {
      language: "typescript",
      code: `function binarySearch(arr: number[], target: number): number {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;\n  }\n  return -1;\n}`,
      explanation: "Invariant: target, if present, is in [lo, hi]. Halve each iteration.",
    },
    visualType: "array",
  },
  "dynamic-programming": {
    slug: "dynamic-programming",
    concept:
      "Dynamic Programming (DP) solves problems by combining solutions to overlapping subproblems, storing results to avoid recomputation. It is the most powerful optimization technique for interviews.",
    keyIdeas: [
      "Overlapping subproblems + optimal substructure = DP",
      "Memoization (top-down) vs tabulation (bottom-up)",
      "State definition is the hardest part",
      "Space optimization often reduces O(n²) to O(n)",
    ],
    operations: [
      { name: "Memoize", description: "Cache recursive results", time: "O(n)", space: "O(n)" },
      { name: "Tabulate", description: "Iterative DP table", time: "O(n)", space: "O(n)" },
      { name: "Knapsack", description: "Include or skip item", time: "O(n·W)", space: "O(W)" },
      { name: "LCS / LIS", description: "Sequence alignment", time: "O(n·m)", space: "O(n·m)" },
    ],
    complexity: { time: "O(n·W) typical", space: "O(n) with optimization", note: "DP trades space for time via memoization." },
    codeExample: {
      language: "typescript",
      code: `// Climbing stairs — O(n)\nfunction climbStairs(n: number): number {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) { const c = a + b; a = b; b = c; }\n  return b;\n}`,
      explanation: "dp[i] = dp[i-1] + dp[i-2]. Only last two values needed, so O(1) space.",
    },
    visualType: "none",
  },
};
