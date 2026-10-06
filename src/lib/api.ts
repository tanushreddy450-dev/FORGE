/**
 * Central API client for FORGE.
 * Falls back gracefully when backend is unavailable so UI still works with mock data.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
const TOKEN_KEY = "algomaster_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type FetchOpts = RequestInit & { auth?: boolean };

async function apiFetch(path: string, opts: FetchOpts = {}): Promise<unknown> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (opts.auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } })?.error?.message || (body as { detail?: string })?.detail || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

// --- Auth ---
export async function register(payload: { email: string; username: string; full_name: string; password: string; college?: string }) {
  const body = (await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(payload) })) as {
    data: { user: unknown; access_token: string };
  };
  setToken(body.data.access_token);
  return body;
}
export async function login(payload: { email: string; password: string }) {
  const body = (await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(payload) })) as {
    data: { user: unknown; access_token: string };
  };
  setToken(body.data.access_token);
  return body;
}
export async function fetchMe() {
  const body = (await apiFetch("/api/auth/me", { auth: true })) as { data: unknown };
  return body.data;
}
export function logout() {
  clearToken();
}

export type OAuthStatus = {
  google: { configured: boolean; client_id_configured: boolean };
  linkedin: { configured: boolean; client_id_configured: boolean };
};

export async function fetchOAuthStatus(): Promise<OAuthStatus> {
  const body = (await apiFetch("/api/auth/oauth/status")) as { data: OAuthStatus };
  return body.data;
}

export function getOAuthAuthorizeUrl(provider: "google" | "linkedin", redirectTo?: string): string {
  const q = new URLSearchParams();
  if (redirectTo) q.set("redirect_to", redirectTo);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return `${API_BASE}/api/auth/oauth/${provider}/authorize${qs}`;
}

// --- Topics ---
export async function fetchTopics(params?: { category?: string; search?: string }) {
  const q = new URLSearchParams();
  if (params?.category && params.category !== "All") q.set("category", params.category);
  if (params?.search) q.set("search", params.search);
  const qs = q.toString() ? `?${q.toString()}` : "";
  const body = (await apiFetch(`/api/topics${qs}`, { auth: !!getToken() })) as { data: unknown[] };
  return body.data;
}
export async function fetchTopic(idOrSlug: string) {
  const body = (await apiFetch(`/api/topics/${idOrSlug}`, { auth: !!getToken() })) as { data: unknown };
  return body.data;
}

// --- Problems ---
export async function fetchProblems(params?: { difficulty?: string; topic_id?: string; search?: string; tag?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams();
  if (params?.difficulty && params.difficulty !== "All") q.set("difficulty", params.difficulty);
  if (params?.topic_id && params.topic_id !== "All") q.set("topic_id", params.topic_id);
  if (params?.search) q.set("search", params.search);
  if (params?.tag) q.set("tag", params.tag);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString() ? `?${q.toString()}` : "";
  const body = (await apiFetch(`/api/problems${qs}`, { auth: !!getToken() })) as { data: unknown[]; total: number };
  return body;
}
export async function fetchProblem(idOrSlug: string) {
  const body = (await apiFetch(`/api/problems/${idOrSlug}`, { auth: !!getToken() })) as { data: unknown };
  return body.data;
}

// --- Submissions ---
export async function createSubmission(payload: { problem_id: number; language: string; code: string }) {
  const body = (await apiFetch("/api/submissions", { method: "POST", auth: true, body: JSON.stringify(payload) })) as { data: unknown };
  return body.data;
}
export async function runSubmission(payload: { problem_id: number; language: string; code: string }) {
  const body = (await apiFetch("/api/submissions/run", { method: "POST", auth: true, body: JSON.stringify(payload) })) as { data: unknown };
  return body.data as {
    status: string;
    runtime_ms?: number;
    memory_kb?: number;
    stdout?: string;
    stderr?: string;
    compile_error?: string;
    results?: { index: number; passed: boolean; status: string; hidden: boolean; runtime_ms?: number; input?: string; expected?: string; output?: string }[];
    provider?: string;
    success?: boolean;
  };
}
export async function fetchSubmissions(params?: { problem_id?: number }) {
  const q = new URLSearchParams();
  if (params?.problem_id) q.set("problem_id", String(params.problem_id));
  const qs = q.toString() ? `?${q.toString()}` : "";
  const body = (await apiFetch(`/api/submissions${qs}`, { auth: true })) as { data: unknown[]; total: number };
  return body;
}
export async function fetchSubmission(id: number) {
  const body = (await apiFetch(`/api/submissions/${id}`, { auth: true })) as { data: unknown };
  return body.data;
}

// --- Progress / Leaderboard / Recommendations ---
export async function fetchProgress() {
  const body = (await apiFetch("/api/progress", { auth: true })) as { data: unknown };
  return body.data;
}
export async function fetchLeaderboard(limit = 20) {
  const body = (await apiFetch(`/api/leaderboard?limit=${limit}`)) as { data: unknown[] };
  return body.data;
}
export async function fetchRecommendations(limit = 5) {
  const body = (await apiFetch(`/api/recommendations?limit=${limit}`, { auth: true })) as { data: unknown[] };
  return body.data;
}

// --- AI ---
export async function fetchConcept(problem_id: number, title?: string, topic?: string, description?: string) {
  const body = (await apiFetch("/api/ai/concept", { method: "POST", auth: true, body: JSON.stringify({ problem_id, title, topic, description }) })) as { data: unknown };
  return body.data;
}
export async function fetchHint(problem_id: number, hint_level: number) {
  const body = (await apiFetch("/api/ai/hint", { method: "POST", auth: true, body: JSON.stringify({ problem_id, hint_level }) })) as { data: unknown };
  return body.data;
}
export async function fetchExplain(problem_id: number, code: string, error: string) {
  const body = (await apiFetch("/api/ai/explain", { method: "POST", auth: true, body: JSON.stringify({ problem_id, code, error }) })) as { data: unknown };
  return body.data;
}
export async function fetchComplexity(problem_id: number, code: string) {
  const body = (await apiFetch("/api/ai/complexity", { method: "POST", auth: true, body: JSON.stringify({ problem_id, code }) })) as { data: unknown };
  return body.data;
}
export async function askTutor(payload: { problem_id: number; question: string; code?: string; conversation_id?: number | null }) {
  const body = (await apiFetch("/api/ai/ask", { method: "POST", auth: true, body: JSON.stringify(payload) })) as { data: unknown };
  return body.data;
}
export async function createConversation(problem_id?: number, title?: string) {
  const body = (await apiFetch("/api/ai/conversations", { method: "POST", auth: true, body: JSON.stringify({ problem_id, title }) })) as { data: unknown };
  return body.data;
}
export async function fetchConversations() {
  const body = (await apiFetch("/api/ai/conversations", { auth: true })) as { data: unknown[] };
  return body.data;
}
export async function fetchConversation(id: number) {
  const body = (await apiFetch(`/api/ai/conversations/${id}`, { auth: true })) as { data: unknown };
  return body.data;
}
export async function sendConversationMessage(id: number, content: string, problem_id?: number, code?: string) {
  const body = (await apiFetch(`/api/ai/conversations/${id}/messages`, { method: "POST", auth: true, body: JSON.stringify({ content, problem_id, code }) })) as { data: unknown };
  return body.data;
}

// --- Insights ---
export async function fetchInsights() {
  const body = (await apiFetch("/api/insights", { auth: true })) as { data: unknown };
  return body.data;
}
export async function fetchInsightsWithRecs() {
  const body = (await apiFetch("/api/insights/recommendations", { auth: true })) as { data: { insights: unknown; recommendations: unknown[] } };
  return body.data;
}

// --- AlgoMentor & 3D Model Explainer ---
export type VisualizerStep = {
  array: number[];
  active_indices?: number[];
  comparing_indices?: number[];
  found_indices?: number[];
  swapped_indices?: number[];
  sorted_indices?: number[];
  pointers?: Record<string, number>;
  operation?: string;
  description: string;
};

export type VisualizationData = {
  type: string;
  title: string;
  concept: string;
  mistake_summary: string;
  steps: VisualizerStep[];
};

export type LearningProfileData = {
  is_personalized: boolean;
  difficulty_level: "normal" | "repeated" | "persistent";
  weak_topic?: string | null;
  topic_attempts: number;
  topic_failures: number;
  topic_solved: number;
  problem_attempts: number;
  recurring_pattern?: string | null;
  recommended_concept?: string | null;
  message?: string | null;
};

export type QuestionOption = {
  label: string;
  correct: boolean;
  feedback: string;
};

export type InteractiveQuestion = {
  prompt: string;
  options: QuestionOption[];
};

export type CodeReference = {
  line_number?: number | null;
  code_snippet?: string | null;
  observation?: string | null;
};

export type MicroExampleStep = {
  current: string;
  needed: string;
  question: string;
  options: string[];
  correct_option: string;
  explanation: string;
};

export type MicroExample = {
  title: string;
  input_data: string;
  steps: MicroExampleStep[];
};

export type MentorAnalysis = {
  diagnosis: string;
  concept: string;
  explanation: string;
  hint: string;
  severity: "low" | "medium" | "high";
  nextAction: string;
  provider: string;
  attempt_number: number;
  has_3d_explanation?: boolean;
  visualization?: VisualizationData | null;
  learning_profile?: LearningProfileData | null;
  interactive_question?: InteractiveQuestion | null;
  code_reference?: CodeReference | null;
  micro_example?: MicroExample | null;
  analogy?: string | null;
  teaching_step?: number;
  contextual_actions?: string[];
};

export type MentorInteractResponse = {
  evaluation?: "correct" | "partially_correct" | "incorrect" | null;
  feedback: string;
  message: string;
  analogy?: string | null;
  micro_example?: MicroExample | null;
  next_question?: InteractiveQuestion | null;
  code_reference?: CodeReference | null;
  visualization?: VisualizationData | null;
  level: number;
  teaching_step: number;
  is_completed: boolean;
  contextual_actions: string[];
  suggested_quick_check?: string | null;
};

export type MentorInteractPayload = {
  problem_id: number;
  title?: string;
  topic?: string;
  difficulty?: string;
  description?: string;
  code?: string;
  language?: string;
  execution_status?: string;
  compile_error?: string;
  stderr?: string;
  stdout?: string;
  test_results?: any[];
  action: string;
  student_answer?: string;
  current_question?: string;
  conversation_history?: { role: string; content: string }[];
  teaching_step?: number;
  level?: number;
};

export async function analyzeMentor(payload: {
  problem_id: number;
  title: string;
  topic: string;
  difficulty: string;
  description: string;
  language: string;
  code: string;
  execution_status: string;
  compile_error: string;
  stderr: string;
  stdout: string;
  test_results: { index: number; passed: boolean; status: string; hidden: boolean; input?: string; expected?: string; output?: string }[];
  attempt_number: number;
  previous_hints: string[];
}): Promise<MentorAnalysis> {
  const body = (await apiFetch("/api/ai/mentor", { method: "POST", auth: true, body: JSON.stringify(payload) })) as { data: MentorAnalysis };
  return body.data;
}

export async function interactMentor(payload: MentorInteractPayload): Promise<MentorInteractResponse> {
  const body = (await apiFetch("/api/ai/mentor/interact", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  })) as { data: MentorInteractResponse };
  return body.data;
}

export async function requestTTS(
  text: string,
  voice = "autumn"
): Promise<{ audio_base64: string; mime_type: string; cached: boolean }> {
  const body = (await apiFetch("/api/ai/tts", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ text, voice }),
  })) as { data: { audio_base64: string; mime_type: string; cached: boolean } };
  return body.data;
}
