import type { Topic, Problem, Activity, UserProfile } from "@/types";

export const topics: Topic[] = [
  {
    id: "1",
    name: "Arrays",
    slug: "arrays",
    description:
      "The foundation of all data structures. Master contiguous memory, indexing, and the two-pointer and sliding window patterns.",
    icon: "Grid3X3",
    difficulty: "Beginner",
    problemCount: 24,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Introduction to Arrays",
      "Array Traversal",
      "Linear Search",
      "Binary Search",
      "Sorting Algorithms",
      "Two Pointer Technique",
      "Sliding Window",
      "Prefix Sum",
    ],
  },
  {
    id: "2",
    name: "Strings",
    slug: "strings",
    description:
      "Immutable character sequences backed by arrays. Learn slicing, pattern matching, and string hashing techniques.",
    icon: "Type",
    difficulty: "Beginner",
    problemCount: 18,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "String Basics & Immutability",
      "Two Pointers on Strings",
      "Sliding Window on Strings",
      "Anagram & Frequency",
      "Palindromes",
      "KMP & Rabin-Karp",
    ],
  },
  {
    id: "3",
    name: "Linked Lists",
    slug: "linked-lists",
    description:
      "Chain of nodes with dynamic size. O(1) insert/delete once located, O(n) access. Fast & slow pointers unlock many tricks.",
    icon: "Link",
    difficulty: "Beginner",
    problemCount: 18,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Singly Linked List",
      "Doubly Linked List",
      "Circular Linked List",
      "Fast & Slow Pointers",
      "Reversal Techniques",
      "Merge Sorted Lists",
    ],
  },
  {
    id: "4",
    name: "Stacks",
    slug: "stacks",
    description:
      "Last-In-First-Out. The call stack, undo history, and parentheses matching all rely on stacks. Monotonic stacks are interview favorites.",
    icon: "Layers",
    difficulty: "Beginner",
    problemCount: 14,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Stack Implementation",
      "Balanced Parentheses",
      "Next Greater Element",
      "Monotonic Stack",
      "Min Stack",
      "Stack via Queues",
    ],
  },
  {
    id: "5",
    name: "Queues",
    slug: "queues",
    description:
      "First-In-First-Out. From BFS to task scheduling, queues process in arrival order. Deques and circular buffers make them efficient.",
    icon: "Rows",
    difficulty: "Beginner",
    problemCount: 12,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Queue Implementation",
      "Circular Queue",
      "Deque",
      "Queue via Stacks",
      "Sliding Window Maximum",
      "BFS with Queues",
    ],
  },
  {
    id: "6",
    name: "Hashing",
    slug: "hashing",
    description:
      "Average O(1) lookup via hash functions. Master collision handling, load factor, and the patterns that make hashing the most used technique.",
    icon: "Hash",
    difficulty: "Intermediate",
    problemCount: 22,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Hash Function Design",
      "Collision Resolution",
      "Two Sum Pattern",
      "Frequency Counting",
      "Anagram Groups",
      "Subarray Sum Equals K",
    ],
  },
  {
    id: "7",
    name: "Recursion",
    slug: "recursion",
    description:
      "Solve big problems by solving smaller ones. Base case, recursive case, and the call stack. Backtracking is recursion with choices.",
    icon: "Repeat",
    difficulty: "Intermediate",
    problemCount: 16,
    completedProblems: 0,
    category: "Algorithms",
    subtopics: [
      "Recursion Basics",
      "Call Stack & Base Cases",
      "Backtracking Template",
      "N-Queens",
      "Subsets & Permutations",
      "Memoization",
    ],
  },
  {
    id: "8",
    name: "Trees",
    slug: "trees",
    description:
      "Hierarchical structures with root and leaves. Traversals, LCA, and diameter build the intuition for all tree problems.",
    icon: "Binary",
    difficulty: "Intermediate",
    problemCount: 28,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Binary Tree Basics",
      "Tree Traversals",
      "Lowest Common Ancestor",
      "Tree Diameter",
      "Serialization",
      "Path Sum Problems",
    ],
  },
  {
    id: "9",
    name: "Binary Search Trees",
    slug: "binary-search-trees",
    description:
      "Ordered binary trees where inorder is sorted. Validate, insert, delete, and balance — the gateway to self-balancing trees.",
    icon: "GitBranch",
    difficulty: "Intermediate",
    problemCount: 16,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "BST Property",
      "Validate BST",
      "Insert & Delete",
      "Successor & Predecessor",
      "Balanced BSTs (AVL)",
      "BST to Sorted List",
    ],
  },
  {
    id: "10",
    name: "Heaps",
    slug: "heaps",
    description:
      "Complete binary trees for priority queues. O(log n) push/pop, O(1) peek. Top-K, median, and scheduling all use heaps.",
    icon: "Triangle",
    difficulty: "Intermediate",
    problemCount: 14,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Min Heap / Max Heap",
      "Heap Sort",
      "Top K Elements",
      "Median of Stream",
      "Merge K Sorted Lists",
      "Task Scheduling",
    ],
  },
  {
    id: "11",
    name: "Graphs",
    slug: "graphs",
    description:
      "Vertices and edges modeling networks. BFS, DFS, Dijkstra, and topological sort are the core graph toolkit.",
    icon: "Network",
    difficulty: "Advanced",
    problemCount: 32,
    completedProblems: 0,
    category: "Data Structures",
    subtopics: [
      "Graph Representation",
      "BFS & DFS",
      "Connected Components",
      "Topological Sort",
      "Dijkstra's Algorithm",
      "Union-Find",
    ],
  },
  {
    id: "12",
    name: "Sorting",
    slug: "sorting",
    description:
      "Order from chaos. Compare bubble, selection, insertion, then master O(n log n) merge, quick, and heap sorts.",
    icon: "ArrowUpDown",
    difficulty: "Beginner",
    problemCount: 18,
    completedProblems: 0,
    category: "Algorithms",
    subtopics: [
      "Bubble Sort",
      "Selection Sort",
      "Insertion Sort",
      "Merge Sort",
      "Quick Sort",
      "Counting & Radix Sort",
    ],
  },
  {
    id: "13",
    name: "Searching",
    slug: "searching",
    description:
      "Find efficiently. Linear, binary, ternary, and hash-based search — the right choice depends on sortedness and structure.",
    icon: "Search",
    difficulty: "Beginner",
    problemCount: 14,
    completedProblems: 0,
    category: "Algorithms",
    subtopics: [
      "Linear Search",
      "Binary Search",
      "Binary Search Variants",
      "Ternary Search",
      "Search in Rotated Array",
      "Hash Search",
    ],
  },
  {
    id: "14",
    name: "Dynamic Programming",
    slug: "dynamic-programming",
    description:
      "Optimization over overlapping subproblems. Memoization vs tabulation, knapsack, LCS, and the patterns that crack hard problems.",
    icon: "Brain",
    difficulty: "Advanced",
    problemCount: 36,
    completedProblems: 0,
    category: "Algorithms",
    subtopics: [
      "Introduction to DP",
      "Memoization vs Tabulation",
      "0/1 Knapsack",
      "Longest Common Subsequence",
      "Coin Change",
      "Climbing Stairs & House Robber",
    ],
  },
];

export const problems: Problem[] = [
  {
    id: "1",
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    topicId: "6",
    topicName: "Hashing",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

**Follow up:** Can you come up with an algorithm that is less than O(n²) time complexity?`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation:
          "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
      {
        input: "nums = [3,3], target = 6",
        output: "[0,1]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10⁴",
      "-10⁹ <= nums[i] <= 10⁹",
      "-10⁹ <= target <= 10⁹",
      "Only one valid answer exists.",
    ],
    starterCode: `function twoSum(nums: number[], target: number): number[] {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", hidden: false },
      { id: "2", input: "[3,2,4]\n6", expectedOutput: "[1,2]", hidden: false },
      { id: "3", input: "[3,3]\n6", expectedOutput: "[0,1]", hidden: true },
    ],
    tags: ["Array", "Hash Table"],
    acceptance: 62.5,
    solved: false,
  },
  {
    id: "2",
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    topicId: "4",
    topicName: "Stacks",
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
    ],
    constraints: [
      "1 <= s.length <= 10⁴",
      "s consists of parentheses only '()[]{}'",
    ],
    starterCode: `function isValid(s: string): boolean {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "()", expectedOutput: "true", hidden: false },
      { id: "2", input: "()[]{}", expectedOutput: "true", hidden: false },
      { id: "3", input: "(]", expectedOutput: "false", hidden: true },
    ],
    tags: ["Stack", "String"],
    acceptance: 70.1,
    solved: false,
  },
  {
    id: "3",
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "Easy",
    topicId: "3",
    topicName: "Linked Lists",
    description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
      },
      {
        input: "head = [1,2]",
        output: "[2,1]",
      },
    ],
    constraints: [
      "The number of nodes in the list is [0, 5000]",
      "-5000 <= Node.val <= 5000",
    ],
    starterCode: `function reverseList(head: ListNode | null): ListNode | null {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]", hidden: false },
      { id: "2", input: "[1,2]", expectedOutput: "[2,1]", hidden: false },
    ],
    tags: ["Linked List", "Recursion"],
    acceptance: 75.3,
    solved: false,
  },
  {
    id: "4",
    title: "Binary Search",
    slug: "binary-search",
    difficulty: "Easy",
    topicId: "13",
    topicName: "Searching",
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return -1.

You must write an algorithm with O(log n) runtime complexity.`,
    examples: [
      {
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
      },
      {
        input: "nums = [-1,0,3,5,9,12], target = 2",
        output: "-1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10⁴",
      "-10⁴ < nums[i], target < 10⁴",
      "All the integers in nums are unique.",
      "nums is sorted in ascending order.",
    ],
    starterCode: `function search(nums: number[], target: number): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[-1,0,3,5,9,12]\n9", expectedOutput: "4", hidden: false },
      { id: "2", input: "[-1,0,3,5,9,12]\n2", expectedOutput: "-1", hidden: false },
    ],
    tags: ["Array", "Binary Search"],
    acceptance: 55.8,
    solved: false,
  },
  {
    id: "5",
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "Medium",
    topicId: "14",
    topicName: "Dynamic Programming",
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10⁵",
      "-10⁴ <= nums[i] <= 10⁴",
    ],
    starterCode: `function maxSubArray(nums: number[]): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", hidden: false },
      { id: "2", input: "[1]", expectedOutput: "1", hidden: false },
    ],
    tags: ["Array", "Dynamic Programming", "Divide and Conquer"],
    acceptance: 50.2,
    solved: false,
  },
  {
    id: "6",
    title: "Number of Islands",
    slug: "number-of-islands",
    difficulty: "Medium",
    topicId: "11",
    topicName: "Graphs",
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of '1's (land) and '0's (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    examples: [
      {
        input: `grid = [
  ["1","1","1","1","0"],
  ["1","1","0","1","0"],
  ["1","1","0","0","0"],
  ["0","0","0","0","0"]
]`,
        output: "1",
      },
    ],
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'.",
    ],
    starterCode: `function numIslands(grid: string[][]): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expectedOutput: "1", hidden: false },
    ],
    tags: ["DFS", "BFS", "Union Find", "Matrix"],
    acceptance: 57.8,
    solved: false,
  },
  {
    id: "7",
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    difficulty: "Easy",
    topicId: "14",
    topicName: "Dynamic Programming",
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top. Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "1. 1 step + 1 step\n2. 2 steps",
      },
      {
        input: "n = 3",
        output: "3",
        explanation: "1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step",
      },
    ],
    constraints: ["1 <= n <= 45"],
    starterCode: `function climbStairs(n: number): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "2", expectedOutput: "2", hidden: false },
      { id: "2", input: "3", expectedOutput: "3", hidden: false },
    ],
    tags: ["Dynamic Programming", "Math", "Memoization"],
    acceptance: 68.4,
    solved: false,
  },
  {
    id: "8",
    title: "Merge Sort",
    slug: "merge-sort",
    difficulty: "Medium",
    topicId: "12",
    topicName: "Sorting",
    description: `Implement the merge sort algorithm to sort an array of integers in ascending order.`,
    examples: [
      {
        input: "nums = [5,2,3,1]",
        output: "[1,2,3,5]",
      },
      {
        input: "nums = [5,1,1,2,0,0]",
        output: "[0,0,1,1,2,5]",
      },
    ],
    constraints: [
      "1 <= nums.length <= 5 * 10⁴",
      "-5 * 10⁴ <= nums[i] <= 5 * 10⁴",
    ],
    starterCode: `function mergeSort(nums: number[]): number[] {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[5,2,3,1]", expectedOutput: "[1,2,3,5]", hidden: false },
      { id: "2", input: "[5,1,1,2,0,0]", expectedOutput: "[0,0,1,1,2,5]", hidden: false },
    ],
    tags: ["Array", "Divide and Conquer", "Sorting"],
    acceptance: 65.0,
    solved: false,
  },
  {
    id: "9",
    title: "N-Queens",
    slug: "n-queens",
    difficulty: "Hard",
    topicId: "7",
    topicName: "Recursion",
    description: `The n-queens puzzle is the problem of placing \`n\` queens on an \`n x n\` chessboard such that no two queens attack each other.

Given an integer \`n\`, return the number of distinct solutions to the n-queens puzzle.`,
    examples: [
      {
        input: "n = 4",
        output: "2",
        explanation: "There are two distinct solutions to the 4-queens puzzle.",
      },
      {
        input: "n = 1",
        output: "1",
      },
    ],
    constraints: ["1 <= n <= 9"],
    starterCode: `function totalNQueens(n: number): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "4", expectedOutput: "2", hidden: false },
      { id: "2", input: "1", expectedOutput: "1", hidden: false },
    ],
    tags: ["Backtracking", "Recursion"],
    acceptance: 65.6,
    solved: false,
  },
  {
    id: "10",
    title: "LRU Cache",
    slug: "lru-cache",
    difficulty: "Hard",
    topicId: "6",
    topicName: "Hashing",
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\` Initialize the LRU cache with positive size capacity.
- \`int get(int key)\` Return the value of the key if the key exists, otherwise return -1.
- \`void put(int key, int value)\` Update or insert the value. When the cache reaches capacity, evict the least recently used key.`,
    examples: [
      {
        input: `["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]`,
        output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
      },
    ],
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10⁴",
      "0 <= value <= 10⁵",
      "At most 2 * 10⁵ calls will be made to get and put.",
    ],
    starterCode: `class LRUCache {
    constructor(capacity: number) {
        
    }

    get(key: number): number {
        
    }

    put(key: number, value: number): void {
        
    }
}`,
    testCases: [
      { id: "1", input: "2\nput(1,1)\nput(2,2)\nget(1)\nput(3,3)\nget(2)", expectedOutput: "1\n-1", hidden: false },
    ],
    tags: ["Hash Table", "Linked List", "Design"],
    acceptance: 40.8,
    solved: false,
  },
  {
    id: "11",
    title: "Valid Anagram",
    slug: "valid-anagram",
    difficulty: "Easy",
    topicId: "2",
    topicName: "Strings",
    description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true" },
      { input: 's = "rat", t = "car"', output: "false" },
    ],
    constraints: ["1 <= s.length, t.length <= 5 * 10⁴", "s and t consist of lowercase English letters"],
    starterCode: `function isAnagram(s: string, t: string): boolean {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "anagram\nnagaram", expectedOutput: "true", hidden: false },
      { id: "2", input: "rat\ncar", expectedOutput: "false", hidden: false },
    ],
    tags: ["Hash Table", "String", "Sorting"],
    acceptance: 64.2,
    solved: false,
  },
  {
    id: "12",
    title: "Validate BST",
    slug: "validate-bst",
    difficulty: "Medium",
    topicId: "9",
    topicName: "Binary Search Trees",
    description: `Given the \`root\` of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys **less than** the node's key.
- The right subtree of a node contains only nodes with keys **greater than** the node's key.
- Both the left and right subtrees must also be binary search trees.`,
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      { input: "root = [5,1,4,null,null,3,6]", output: "false" },
    ],
    constraints: ["The number of nodes in the tree is in the range [1, 10⁴]", "-2³¹ <= Node.val <= 2³¹ - 1"],
    starterCode: `function isValidBST(root: TreeNode | null): boolean {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "[2,1,3]", expectedOutput: "true", hidden: false },
      { id: "2", input: "[5,1,4,null,null,3,6]", expectedOutput: "false", hidden: false },
    ],
    tags: ["Tree", "BST", "DFS"],
    acceptance: 32.1,
    solved: false,
  },
  {
    id: "13",
    title: "Pow(x, n)",
    slug: "powx-n",
    difficulty: "Medium",
    topicId: "7",
    topicName: "Recursion",
    description: `Implement pow(x, n), which calculates \`x\` raised to the power \`n\` (i.e., xⁿ).

You must not use any built-in library function.`,
    examples: [
      { input: "x = 2.00000, n = 10", output: "1024.00000" },
      { input: "x = 2.10000, n = 3", output: "9.26100" },
      { input: "x = 2.00000, n = -2", output: "0.25000" },
    ],
    constraints: ["-100.0 < x < 100.0", "-2³¹ <= n <= 2³¹-1", "-10⁴ <= xⁿ <= 10⁴"],
    starterCode: `function myPow(x: number, n: number): number {
    // Write your solution here
    
}`,
    testCases: [
      { id: "1", input: "2.00000\n10", expectedOutput: "1024.00000", hidden: false },
      { id: "2", input: "2.10000\n3", expectedOutput: "9.26100", hidden: false },
      { id: "3", input: "2.00000\n-2", expectedOutput: "0.25000", hidden: true },
    ],
    tags: ["Math", "Recursion"],
    acceptance: 35.4,
    solved: false,
  },
];

export const recentActivity: Activity[] = [];

export const userProfile: UserProfile = {
  name: "Surya",
  email: "surya@college.edu",
  avatar: "",
  joinedDate: "January 2026",
  bio: "CS student passionate about algorithms and competitive programming.",
  college: "Indian Institute of Technology",
  stats: {
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    streak: 0,
    totalSubmissions: 0,
    topicsCompleted: 0,
    rank: "Knight",
  },
};
