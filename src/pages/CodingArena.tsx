import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
  Send,
  Code2,
  Sparkles,
  Brain,
  X,
  Trash2,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { motion } from "motion/react";
import { DUR, EASE } from "@/components/motion/motion-tokens";
import type { Problem } from "@/types";
import { fetchProblem, createSubmission, runSubmission, getToken, type VisualizationData } from "@/lib/api";
import AITutorPanel from "@/components/tutor/AITutorPanel";
import AlgoMentorPanel from "@/components/tutor/AlgoMentorPanel";
import Interactive3DExplainer from "@/components/visualizers/Interactive3DExplainer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/shadcn/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const difficultyConfig: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  Easy: {
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  Medium: {
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Hard: {
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

const languages = [
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "python", label: "Python", ext: ".py" },
  { id: "java", label: "Java", ext: ".java" },
  { id: "cpp", label: "C++", ext: ".cpp" },
];

function parseDescription(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.trim() === "") return <br key={i} />;

    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(/`([^`]+)`/);

      let firstMatch: { type: string; index: number; match: RegExpMatchArray } | null = null;

      if (boldMatch && (!codeMatch || (boldMatch.index ?? 0) < (codeMatch.index ?? 0))) {
        firstMatch = { type: "bold", index: boldMatch.index ?? 0, match: boldMatch };
      } else if (codeMatch) {
        firstMatch = { type: "code", index: codeMatch.index ?? 0, match: codeMatch };
      }

      if (!firstMatch) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (firstMatch.index > 0) {
        parts.push(
          <span key={keyIdx++}>{remaining.slice(0, firstMatch.index)}</span>,
        );
      }

      if (firstMatch.type === "bold") {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-foreground">
            {firstMatch.match[1]}
          </strong>,
        );
      } else {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em] border border-border"
          >
            {firstMatch.match[1]}
          </code>,
        );
      }

      remaining = remaining.slice(
        firstMatch.index + firstMatch.match[0].length,
      );
    }

    if (parts.some((p) => typeof p === "string" && /^\d+\./.test(p))) {
      return (
        <li
          key={i}
          className="ml-4 list-decimal text-muted-foreground leading-relaxed mb-1"
        >
          {parts}
        </li>
      );
    }

    return (
      <p key={i} className="text-muted-foreground leading-relaxed mb-2 font-sans">
        {parts}
      </p>
    );
  });
}

function normalizeProblem(raw: Record<string, unknown>): Problem {
  return {
    id: String(raw.id as string | number),
    title: raw.title as string,
    slug: raw.slug as string,
    difficulty: raw.difficulty as Problem["difficulty"],
    topicId: String(raw.topic_id ?? raw.topicId ?? ""),
    topicName: (raw.topic_name ?? raw.topicName ?? "") as string,
    description: raw.description as string,
    examples: (raw.examples as Problem["examples"]) ?? [],
    constraints: (raw.constraints as string[]) ?? [],
    starterCode: (raw.starter_code as string) ?? (raw.starterCode as string) ?? "",
    testCases: (raw.test_cases as Problem["testCases"]) ?? (raw.testCases as Problem["testCases"]) ?? [],
    tags: (raw.tags as string[]) ?? [],
    acceptance: (raw.acceptance as number) ?? 0,
    solved: (raw.solved as boolean) ?? false,
  };
}

export default function CodingArena() {
  const { problemSlug } = useParams<{ problemSlug: string }>();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [problemLoading, setProblemLoading] = useState(true);
  const [problemError, setProblemError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // New Collapsible UX states
  const [showMentor, setShowMentor] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"problem" | "code" | "console" | "mentor">("code");
  const [rightPanel, setRightPanel] = useState<"mentor" | "tutor">("mentor");

  const [explainerData, setExplainerData] = useState<VisualizationData | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    status: string;
    runtime_ms?: number;
    memory_kb?: number;
    stdout?: string;
    stderr?: string;
    compile_error?: string;
    provider?: string;
    test_results?: { index: number; passed: boolean; status: string; hidden: boolean }[];
  } | null>(null);
  const [runResult, setRunResult] = useState<{
    status: string;
    runtime_ms?: number;
    memory_kb?: number;
    stdout?: string;
    stderr?: string;
    compile_error?: string;
    provider?: string;
    results?: { index: number; passed: boolean; status: string; hidden: boolean; input?: string; expected?: string; output?: string }[];
  } | null>(null);

  useEffect(() => {
    if (!problemSlug) return;
    setProblemLoading(true);
    setProblemError(null);
    fetchProblem(problemSlug)
      .then((data) => {
        const p = normalizeProblem(data as Record<string, unknown>);
        setProblem(p);
        setCode(p.starterCode);
        setSubmitResult(null);
        setRunResult(null);
        setConsoleOutput(null);
        setProblemError(null);
      })
      .catch((err) => {
        setProblem(null);
        setCode("");
        setProblemError(err instanceof Error ? err.message : "Failed to load problem");
      })
      .finally(() => setProblemLoading(false));
  }, [problemSlug]);

  if (problemLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6" role="status" aria-label="Loading problem">
        <div className="h-8 w-1/3 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <div className="animate-pulse rounded-2xl border border-border bg-card" />
          <div className="animate-pulse rounded-2xl border border-border bg-card" />
        </div>
        <p className="text-sm font-mono text-muted-foreground">Initializing workspace environment…</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold font-mono text-foreground">Problem couldn&apos;t be loaded</h1>
        <p className="max-w-md text-sm text-muted-foreground font-sans">{problemError ?? "The problem you're looking for doesn't exist."}</p>
        <Link to="/problems" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to problem arena
        </Link>
      </div>
    );
  }

  const diff = difficultyConfig[problem.difficulty] || difficultyConfig.Easy;

  async function handleRun() {
    if (!problem) return;
    if (!getToken()) {
      setIsConsoleOpen(true);
      if (isMobile) setMobileTab("console");
      setConsoleOutput("Please log in to run code — execution happens on the server sandbox after login.");
      return;
    }
    setIsRunning(true);
    setIsConsoleOpen(true);
    if (isMobile) setMobileTab("console");
    setConsoleOutput("Executing in server sandbox…");
    setRunResult(null);
    try {
      const data = await runSubmission({ problem_id: Number(problem.id), language: selectedLanguage.id, code });
      setRunResult(data as never);
      const isFailed = data.status === "Compilation Error" || data.status === "Execution Service Unavailable";
      const lines = [
        `Status: ${data.status}`,
        data.compile_error ? `Compile Error:\n${data.compile_error}` : null,
        (data as Record<string, unknown>).error_message ? `Error: ${(data as Record<string, unknown>).error_message}` : null,
        data.stderr && !data.compile_error ? `Stderr: ${data.stderr.slice(0, 500)}` : null,
        data.stdout ? `Stdout: ${data.stdout.slice(0, 500)}` : null,
        `Runtime: ${data.runtime_ms ?? "-"}ms  Memory: ${data.memory_kb ?? "-"}KB  Provider: ${data.provider ?? "forge-runner"}`,
        data.results && data.results.length > 0 && !isFailed
          ? `Tests: ${data.results.filter((r) => r.passed).length}/${data.results.length} passed`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      setConsoleOutput(lines);
      if (data.status !== "Accepted") {
        setRightPanel("mentor");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Run failed";
      setConsoleOutput(`Error: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    if (!problem) return;
    if (!getToken()) {
      setIsConsoleOpen(true);
      if (isMobile) setMobileTab("console");
      setConsoleOutput("Please log in to submit — submissions are graded by the server after login.");
      return;
    }
    setSubmitting(true);
    setIsConsoleOpen(true);
    if (isMobile) setMobileTab("console");
    setConsoleOutput(null);
    setSubmitResult(null);
    setRunResult(null);
    try {
      const data = (await createSubmission({
        problem_id: Number(problem.id),
        language: selectedLanguage.id,
        code,
      })) as {
        status: string;
        runtime_ms?: number;
        memory_kb?: number;
        stdout?: string;
        stderr?: string;
        compile_error?: string;
        error_message?: string;
        test_results?: { index: number; passed: boolean; status: string; hidden: boolean }[];
        provider?: string;
      };
      setSubmitResult(data as never);
      const isFailed = data.status === "Compilation Error" || data.status === "Execution Service Unavailable";
      const lines = [
        `Submission: ${data.status}`,
        data.compile_error ? `Compile Error:\n${data.compile_error}` : null,
        data.error_message ? `Error: ${data.error_message}` : null,
        data.stderr && !data.compile_error ? `Stderr: ${data.stderr.slice(0, 800)}` : null,
        data.stdout ? `Stdout: ${data.stdout.slice(0, 500)}` : null,
        `Runtime: ${data.runtime_ms ?? "-"}ms  Memory: ${data.memory_kb ?? "-"}KB  Provider: ${data.provider ?? "forge-runner"}`,
        data.test_results && data.test_results.length > 0 && !isFailed
          ? `Tests: ${data.test_results.filter((r) => r.passed).length}/${data.test_results.length} passed`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      setConsoleOutput(lines);

      if (data.status === "Accepted") {
        toast.success("Accepted — optimal solution!");
      } else {
        setRightPanel("mentor");
        toast.info(`Submission: ${data.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setConsoleOutput(`Error: ${msg}`);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Sub-renderer: Problem Statement ---
  const renderProblemContent = () => (
    <div className="h-full overflow-y-auto p-5 space-y-6 bg-card">
      <div>
        <h2 className="text-lg font-bold font-mono text-foreground mb-1">
          {problem.title}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${diff.bg} ${diff.color} ${diff.border}`}
          >
            {problem.difficulty}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {problem.acceptance}% acceptance rate
          </span>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        {parseDescription(problem.description)}
      </div>

      <div>
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Test Case Examples
        </h3>
        <div className="space-y-3">
          {problem.examples.map((example, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-muted/20 overflow-hidden"
            >
              <div className="px-3.5 py-1.5 border-b border-border bg-muted/40">
                <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                  Example {i + 1}
                </span>
              </div>
              <div className="p-3.5 space-y-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Input
                  </span>
                  <pre className="mt-1 text-xs text-foreground bg-background rounded-lg p-2 border border-border overflow-x-auto whitespace-pre-wrap">
                    {example.input}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Output
                  </span>
                  <pre className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 bg-background rounded-lg p-2 border border-border overflow-x-auto whitespace-pre-wrap">
                    {example.output}
                  </pre>
                </div>
                {example.explanation && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Explanation
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed font-sans">
                      {example.explanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Constraints
        </h3>
        <ul className="space-y-1">
          {problem.constraints.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-muted-foreground font-mono"
            >
              <span className="text-primary mt-0.5">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Tags & Concepts
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-mono font-medium border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {submitResult && (
        <div className="rounded-xl bg-muted/40 border border-border p-3 shadow-xs">
          <p className="text-xs font-mono">
            Last Submission: <span className={submitResult.status === "Accepted" ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>{submitResult.status}</span>
            <span className="ml-2 text-muted-foreground">
              {submitResult.runtime_ms}ms • {submitResult.memory_kb}KB
            </span>
          </p>
        </div>
      )}
    </div>
  );

  // --- Sub-renderer: Monaco Editor ---
  const renderEditorContent = () => (
    <div className="h-full flex flex-col min-h-0 min-w-0 bg-background">
      {/* Editor Control Bar */}
      <div className="flex items-center justify-between px-3.5 h-10 border-b border-border bg-muted/30 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-xs font-mono text-foreground hover:border-primary/40 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span>{selectedLanguage.label}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {showLanguageDropdown && (
            <div className="absolute top-full mt-1 left-0 w-36 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-1 z-50">
              {languages.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedLanguage(l);
                    setShowLanguageDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    selectedLanguage.id === l.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-muted-foreground">
          {code.split("\n").length} lines
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={selectedLanguage.id === "cpp" ? "cpp" : selectedLanguage.id}
          theme={resolvedTheme === "light" ? "vs" : "vs-dark"}
          value={code}
          onChange={(v) => setCode(v || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>

      {/* Bottom Collapsible Console Drawer */}
      <div className="border-t border-border bg-card shrink-0 transition-all flex flex-col">
        {/* Console Header Bar */}
        <div className="flex items-center justify-between px-3 h-9 bg-muted/40 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Console & Output</span>
            {/* Status Pill */}
            {isRunning ? (
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-mono animate-pulse">
                Running…
              </span>
            ) : submitting ? (
              <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-mono animate-pulse">
                Submitting…
              </span>
            ) : runResult || submitResult ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  (runResult?.status === "Accepted" || submitResult?.status === "Accepted")
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {runResult?.status || submitResult?.status}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground">Ready</span>
            )}
          </button>

          <div className="flex items-center gap-1">
            {consoleOutput && isConsoleOpen && (
              <button
                type="button"
                onClick={() => setConsoleOutput(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted text-[11px] flex items-center gap-1 transition-colors"
                title="Clear console output"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsConsoleOpen(!isConsoleOpen)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isConsoleOpen ? "Collapse console" : "Expand console"}
            >
              {isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Console Body */}
        {isConsoleOpen && (
          <div className="h-44 p-3 overflow-y-auto bg-background/50 border-t border-border/40 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {consoleOutput || (
              <span className="text-muted-foreground italic">
                Press &apos;Run Tests&apos; or &apos;Submit&apos; to view output in the server sandbox.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // --- Sub-renderer: Dedicated Console Tab (Mobile) ---
  const renderConsoleContent = () => (
    <div className="h-full flex flex-col p-4 bg-card font-mono text-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">Execution Console</span>
        </div>
        {consoleOutput && (
          <button
            onClick={() => setConsoleOutput(null)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
      <pre className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed bg-background p-3 rounded-xl border border-border text-foreground">
        {consoleOutput || "No executions yet. Press Run Tests or Submit to execute your code."}
      </pre>
    </div>
  );

  // --- Sub-renderer: AI Mentor Panel ---
  const renderMentorContent = () => (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Panel Top Switcher + Close Button */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 shrink-0 pr-2">
        <div className="flex flex-1">
          <button
            type="button"
            onClick={() => setRightPanel("mentor")}
            className={`flex-1 text-center text-xs font-medium py-2.5 transition-colors flex items-center justify-center gap-1.5 ${
              rightPanel === "mentor"
                ? "text-primary border-b-2 border-primary bg-card font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span>AlgoMentor</span>
            {((runResult && runResult.status !== "Accepted") || (submitResult && submitResult.status !== "Accepted")) && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-medium border border-amber-500/20">
                Hint
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRightPanel("tutor")}
            className={`flex-1 text-center text-xs font-medium py-2.5 transition-colors flex items-center justify-center gap-1.5 ${
              rightPanel === "tutor"
                ? "text-primary border-b-2 border-primary bg-card font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>AI Tutor</span>
          </button>
        </div>

        {/* Close Button for desktop layout */}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setShowMentor(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-2"
            title="Close AlgoMentor panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-hidden">
        {rightPanel === "mentor" ? (
          <AlgoMentorPanel
            problemId={Number(problem.id)}
            problemTitle={problem.title}
            problemTopic={problem.topicName}
            problemDifficulty={problem.difficulty}
            problemDescription={problem.description}
            language={selectedLanguage.id}
            code={code}
            lastResult={runResult || submitResult}
            onOpen3DExplanation={(vis) => setExplainerData(vis)}
          />
        ) : (
          <AITutorPanel
            problemId={Number(problem.id)}
            problemTitle={problem.title}
            problemTopic={problem.topicName}
            problemDescription={problem.description}
            code={code}
          />
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      className="flex flex-col h-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast, ease: EASE }}
    >
      {/* Top Workspace Action Header */}
      <div className="flex items-center gap-3 px-4 min-h-12 border-b border-border bg-muted/30 shrink-0 py-2">
        <Link
          to="/problems"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Back to problems"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate">
            {problem.title}
          </h1>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${diff.bg} ${diff.color} ${diff.border} shrink-0`}
          >
            {problem.difficulty}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline truncate">
            {problem.topicName}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Timer */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary border border-border text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">00:00:00</span>
          </div>

          {/* Ask AlgoMentor Toggle (Desktop) */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setShowMentor(!showMentor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                showMentor
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-secondary hover:bg-secondary/80 text-foreground border-border"
              }`}
              title={showMentor ? "Close AlgoMentor" : "Open AlgoMentor tutor"}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Ask AlgoMentor</span>
              {((runResult && runResult.status !== "Accepted") || (submitResult && submitResult.status !== "Accepted")) && !showMentor && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          )}

          {/* Run Tests Button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || submitting}
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-foreground text-xs font-medium transition-colors flex items-center gap-1.5 border border-border"
          >
            {isRunning ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Play className="w-3 h-3 text-muted-foreground" />
            )}
            {isRunning ? "Running…" : "Run Tests"}
          </button>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || isRunning}
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {submitting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span>Submitting…</span>
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Layout: Dedicated Single View Tabs */}
      {isMobile ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Mobile Navigation Tabs */}
          <div className="flex border-b border-border bg-muted/40 shrink-0 p-1 gap-1">
            <button
              onClick={() => setMobileTab("problem")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mobileTab === "problem"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => setMobileTab("code")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                mobileTab === "code"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setMobileTab("console")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                mobileTab === "console"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Console</span>
              {consoleOutput && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
            <button
              onClick={() => setMobileTab("mentor")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                mobileTab === "mentor"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span>AlgoMentor</span>
            </button>
          </div>

          {/* Active Mobile View */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === "problem" && renderProblemContent()}
            {mobileTab === "code" && renderEditorContent()}
            {mobileTab === "console" && renderConsoleContent()}
            {mobileTab === "mentor" && renderMentorContent()}
          </div>
        </div>
      ) : (
        /* Desktop Layout: Resizable Workspaces with Optional Collapsible AI Mentor */
        <ResizablePanelGroup
          key={showMentor ? "workspace-with-mentor" : "workspace-default"}
          direction="horizontal"
          className="h-[calc(100vh-11rem)] min-h-[560px] w-full"
        >
          {/* Left Panel: Problem Statement */}
          <ResizablePanel
            defaultSize={showMentor ? 28 : 38}
            minSize={20}
            maxSize={55}
            className="overflow-hidden"
          >
            {renderProblemContent()}
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors" />

          {/* Center Panel: Code Editor & Collapsible Console */}
          <ResizablePanel
            defaultSize={showMentor ? 44 : 62}
            minSize={30}
            className="overflow-hidden"
          >
            {renderEditorContent()}
          </ResizablePanel>

          {/* Right Panel: Collapsible AI Mentor */}
          {showMentor && (
            <>
              <ResizableHandle withHandle className="bg-border hover:bg-primary/40 transition-colors" />
              <ResizablePanel
                defaultSize={28}
                minSize={22}
                maxSize={45}
                className="overflow-hidden border-l border-border"
              >
                {renderMentorContent()}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      )}

      {/* Interactive 3D Model Explainer Modal */}
      {explainerData && (
        <Interactive3DExplainer
          visualization={explainerData}
          onClose={() => setExplainerData(null)}
        />
      )}
    </motion.div>
  );
}
