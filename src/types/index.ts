export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  problemCount: number;
  completedProblems: number;
  category: string;
  subtopics: string[];
}

export interface TopicLearningContent {
  slug: string;
  concept: string;
  keyIdeas: string[];
  operations: { name: string; description: string; time: string; space: string }[];
  complexity: { time: string; space: string; note: string };
  codeExample: { language: string; code: string; explanation: string };
  visualType: "array" | "sorting" | "tree" | "graph" | "none";
}

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topicId: string;
  topicName: string;
  description: string;
  examples: Example[];
  constraints: string[];
  starterCode: string;
  testCases: TestCase[];
  tags: string[];
  acceptance: number;
  solved: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface UserProgress {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  streak: number;
  totalSubmissions: number;
  topicsCompleted: number;
  rank: string;
}

export interface Activity {
  id: string;
  type: "solved" | "attempted" | "practiced";
  problemTitle: string;
  topicName: string;
  timestamp: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  joinedDate: string;
  bio: string;
  college: string;
  stats: UserProgress;
}
