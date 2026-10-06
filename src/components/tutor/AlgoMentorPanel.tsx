import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Loader2,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Box,
  Sparkles,
  Target,
  Code2,
  HelpCircle,
  Check,
  RotateCcw,
  BookOpen,
  Send,
  Flame,
  MessageSquare,
  Layers,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  analyzeMentor,
  interactMentor,
  requestTTS,
  type MentorAnalysis,
  type MentorInteractResponse,
  type VisualizationData,
  type QuestionOption,
  type InteractiveQuestion,
} from "@/lib/api";
import { Button } from "@/components/shadcn/ui/button";
import { DUR, EASE } from "@/components/motion/motion-tokens";

type ExecutionResult = {
  status: string;
  runtime_ms?: number;
  memory_kb?: number;
  stdout?: string;
  stderr?: string;
  compile_error?: string;
  provider?: string;
  results?: { index: number; passed: boolean; status: string; hidden: boolean; input?: string; expected?: string; output?: string }[];
  test_results?: { index: number; passed: boolean; status: string; hidden: boolean; input?: string; expected?: string; output?: string }[];
};

type Props = {
  problemId: number;
  problemTitle: string;
  problemTopic: string;
  problemDifficulty: string;
  problemDescription: string;
  language: string;
  code: string;
  lastResult: ExecutionResult | null;
  onOpen3DExplanation?: (vis: VisualizationData) => void;
};

const severityConfig = {
  low: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  medium: { icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  high: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

type TeachingTab = "guide" | "example" | "levels" | "code";

type DialogueMessage = {
  id: string;
  role: "tutor" | "student";
  content: string;
  evaluation?: "correct" | "partially_correct" | "incorrect" | null;
  timestamp: number;
};

type VoiceState = {
  messageId: string | null;
  status: "idle" | "preparing" | "speaking" | "finished" | "blocked" | "error";
  error?: string;
};

function getConciseSpokenText(text: string, maxChars = 200): string {
  let clean = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "Here is the explanation.";
  if (clean.length <= maxChars) return clean;

  const trimmed = clean.slice(0, maxChars);
  const lastPunct = Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("!"), trimmed.lastIndexOf("?"));
  if (lastPunct > 40) {
    return trimmed.slice(0, lastPunct + 1).trim();
  }
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 40) {
    return trimmed.slice(0, lastSpace).trim() + ".";
  }
  return trimmed.trim();
}

export default function AlgoMentorPanel({
  problemId,
  problemTitle,
  problemTopic,
  problemDifficulty,
  problemDescription,
  language,
  code,
  lastResult,
  onOpen3DExplanation,
}: Props) {
  const [analysis, setAnalysis] = useState<MentorAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [previousHints, setPreviousHints] = useState<string[]>([]);

  // Socratic turn-by-turn interactive state
  const [messages, setMessages] = useState<DialogueMessage[]>([
    {
      id: "init-welcome",
      role: "tutor",
      content: `👋 Hi! I'm AlgoMentor, your personal DSA tutor for **${problemTitle}**. Ask me to explain the concept, explore optimal patterns, or run your code to debug errors.`,
      timestamp: Date.now(),
    },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState<InteractiveQuestion | null>(null);
  const [teachingStep, setTeachingStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [studentInput, setStudentInput] = useState("");
  const [interactLoading, setInteractLoading] = useState(false);
  const [contextualActions, setContextualActions] = useState<string[]>([
    "Guide Me", "Ask Me", "Show Example", "Show 3D", "Review My Code"
  ]);

  // Secondary views
  const [activeTab, setActiveTab] = useState<TeachingTab>("guide");
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null);
  const [microStep, setMicroStep] = useState(0);
  const [selectedMicroOption, setSelectedMicroOption] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<number>(2);
  const [showHint, setShowHint] = useState(false);

  // Automatic Voice State & Playback Controllers
  const [voiceState, setVoiceState] = useState<VoiceState>({ messageId: null, status: "idle" });
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const ttsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set(["init-welcome"]));
  const sessionAudioCache = useRef<Map<string, string>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasFailure = lastResult && lastResult.status !== "Accepted";

  // Auto-scroll dialogue stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentQuestion]);

  // Stop currently playing voice & clear any pending timer
  const stopActiveVoice = useCallback(() => {
    if (ttsTimerRef.current) {
      clearTimeout(ttsTimerRef.current);
      ttsTimerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    setVoiceState((prev) =>
      prev.status === "speaking" || prev.status === "preparing"
        ? { messageId: null, status: "idle" }
        : prev
    );
  }, []);

  // Start voice playback (cached or fresh TTS fetch)
  const startVoicePlayback = useCallback(async (messageId: string, fullText: string) => {
    setVoiceState({ messageId, status: "preparing" });
    const spokenText = getConciseSpokenText(fullText, 200);

    try {
      let base64 = sessionAudioCache.current.get(messageId) || sessionAudioCache.current.get(spokenText);
      if (!base64) {
        const res = await requestTTS(spokenText, "autumn");
        base64 = res.audio_base64;
        sessionAudioCache.current.set(messageId, base64);
        sessionAudioCache.current.set(spokenText, base64);
      }

      // Convert base64 to Blob & ObjectURL
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      currentAudioUrlRef.current = url;

      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setVoiceState({ messageId, status: "speaking" });
      };
      audio.onended = () => {
        setVoiceState({ messageId, status: "finished" });
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }
        currentAudioRef.current = null;
      };
      audio.onerror = (e) => {
        console.warn("Audio playback onerror:", e);
        setVoiceState({ messageId, status: "error", error: "Audio playback error" });
      };

      try {
        await audio.play();
      } catch (playErr: any) {
        if (playErr && (playErr.name === "NotAllowedError" || playErr.name === "AbortError")) {
          setVoiceState({ messageId, status: "blocked" });
        } else {
          setVoiceState({ messageId, status: "error", error: playErr?.message || "Playback failed" });
        }
      }
    } catch (err) {
      console.warn("TTS generation error:", err);
      const msg = err instanceof Error ? err.message : "TTS request failed";
      setVoiceState({ messageId, status: "error", error: msg });
    }
  }, []);

  // Automatic Voice Flow: When a new assistant message is rendered, wait ~1s then auto-play TTS
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.role === "tutor" && !processedMessageIds.current.has(lastMsg.id)) {
      processedMessageIds.current.add(lastMsg.id);

      stopActiveVoice();

      ttsTimerRef.current = setTimeout(() => {
        startVoicePlayback(lastMsg.id, lastMsg.content);
      }, 1000);
    }
  }, [messages, stopActiveVoice, startVoicePlayback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopActiveVoice();
    };
  }, [stopActiveVoice]);

  const handleAnalyze = async () => {
    if (!lastResult || !hasFailure) return;
    setLoading(true);
    setError(null);
    setSelectedOption(null);
    setMicroStep(0);
    setSelectedMicroOption(null);
    setShowHint(false);

    try {
      const testResults = lastResult.results || lastResult.test_results || [];
      const result = await analyzeMentor({
        problem_id: problemId,
        title: problemTitle,
        topic: problemTopic,
        difficulty: problemDifficulty,
        description: problemDescription,
        language,
        code,
        execution_status: lastResult.status,
        compile_error: lastResult.compile_error || "",
        stderr: lastResult.stderr || "",
        stdout: lastResult.stdout || "",
        test_results: testResults,
        attempt_number: attemptNumber,
        previous_hints: previousHints,
      });

      setAnalysis(result);
      setAttemptNumber((n) => n + 1);
      if (result.hint) {
        setPreviousHints((prev) => [...prev.slice(-4), result.hint]);
      }

      setCurrentQuestion(result.interactive_question || null);
      setTeachingStep(result.teaching_step || 1);
      setIsCompleted(false);
      setContextualActions(result.contextual_actions || ["Guide Me", "Ask Me", "Show Example", "Show 3D", "Review My Code"]);

      // Initialize Socratic dialogue
      setMessages([
        {
          id: "init-tutor",
          role: "tutor",
          content: result.explanation,
          timestamp: Date.now(),
        },
      ]);
      setActiveTab("guide");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Student submits an answer (either from option click or text input)
  const handleAnswerSubmit = async (answerText: string) => {
    if (!answerText.trim() || interactLoading) return;
    const cleanAns = answerText.trim();
    setStudentInput("");
    stopActiveVoice();
    setInteractLoading(true);

    const userMsg: DialogueMessage = {
      id: `student-${Date.now()}`,
      role: "student",
      content: cleanAns,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: "student", content: cleanAns });

      const testResults = lastResult?.results || lastResult?.test_results || [];
      const resp: MentorInteractResponse = await interactMentor({
        problem_id: problemId,
        title: problemTitle,
        topic: problemTopic,
        difficulty: problemDifficulty,
        description: problemDescription,
        code,
        language,
        execution_status: lastResult?.status,
        compile_error: lastResult?.compile_error || "",
        stderr: lastResult?.stderr || "",
        stdout: lastResult?.stdout || "",
        test_results: testResults,
        action: "answer_question",
        student_answer: cleanAns,
        current_question: currentQuestion?.prompt || "",
        conversation_history: history,
        teaching_step: teachingStep,
        level: activeLevel,
      });

      const tutorText = [resp.feedback, resp.message].filter(Boolean).join("\n\n");
      const tutorMsg: DialogueMessage = {
        id: `tutor-${Date.now()}`,
        role: "tutor",
        content: tutorText,
        evaluation: resp.evaluation,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, tutorMsg]);

      if (resp.next_question) {
        setCurrentQuestion(resp.next_question);
        setSelectedOption(null);
      }
      if (resp.teaching_step) {
        setTeachingStep(resp.teaching_step);
      }
      if (resp.is_completed) {
        setIsCompleted(true);
      }
      if (resp.contextual_actions?.length) {
        setContextualActions(resp.contextual_actions);
      }
      if (resp.visualization) {
        setAnalysis((prev) => (prev ? { ...prev, visualization: resp.visualization } : prev));
      }
    } catch (err) {
      console.error("Interact mentor error:", err);
      const errMsg: DialogueMessage = {
        id: `tutor-err-${Date.now()}`,
        role: "tutor",
        content: "AlgoMentor couldn't respond right now. Please check your connection and try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setInteractLoading(false);
    }
  };

  // Contextual action triggered by student button click
  const handleActionClick = async (actionLabel: string) => {
    if (interactLoading) return;
    stopActiveVoice();

    if (actionLabel === "Show 3D") {
      if (analysis?.visualization && onOpen3DExplanation) {
        onOpen3DExplanation(analysis.visualization);
      }
      return;
    }

    if (actionLabel === "Try the Problem" || actionLabel === "Try Again") {
      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-retry-${Date.now()}`,
          role: "tutor",
          content: "🔥 Great job! Go ahead and update your solution in the code editor, then click 'Run Tests' or 'Submit' to test your solution.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    if (actionLabel === "Show Example") {
      setActiveTab("example");
      return;
    }

    if (actionLabel === "Review My Code") {
      setActiveTab("code");
      return;
    }

    let apiAction = "guide_me";
    if (actionLabel === "Give Hint") apiAction = "give_hint";
    else if (actionLabel === "Explain Concept") apiAction = "explain_concept";
    else if (actionLabel === "Ask Me") apiAction = "ask_me";

    setInteractLoading(true);
    try {
      const testResults = lastResult?.results || lastResult?.test_results || [];
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const resp = await interactMentor({
        problem_id: problemId,
        title: problemTitle,
        topic: problemTopic,
        difficulty: problemDifficulty,
        description: problemDescription,
        code,
        language,
        execution_status: lastResult?.status,
        compile_error: lastResult?.compile_error || "",
        stderr: lastResult?.stderr || "",
        stdout: lastResult?.stdout || "",
        test_results: testResults,
        action: apiAction,
        conversation_history: history,
        teaching_step: teachingStep,
        level: activeLevel,
      });

      const tutorText = [resp.feedback, resp.message].filter(Boolean).join("\n\n");
      setMessages((prev) => [
        ...prev,
        {
          id: `tutor-act-${Date.now()}`,
          role: "tutor",
          content: tutorText,
          timestamp: Date.now(),
        },
      ]);

      if (resp.next_question) {
        setCurrentQuestion(resp.next_question);
        setSelectedOption(null);
      }
      if (resp.contextual_actions?.length) {
        setContextualActions(resp.contextual_actions);
      }
      if (resp.micro_example) {
        setAnalysis((prev) => (prev ? { ...prev, micro_example: resp.micro_example } : prev));
      }
      if (resp.code_reference) {
        setAnalysis((prev) => (prev ? { ...prev, code_reference: resp.code_reference } : prev));
      }
    } catch (err) {
      console.error("Action click error:", err);
    } finally {
      setInteractLoading(false);
    }
  };

  const severity = analysis ? severityConfig[analysis.severity] || severityConfig.medium : severityConfig.medium;
  const SeverityIcon = severity.icon;

  return (
    <div className="h-full flex flex-col bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">AlgoMentor</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium border border-border">
                AI Assistant
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Understands your code • Guided hints
            </p>
          </div>
        </div>

        {analysis && (
          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
            Attempt #{analysis.attempt_number}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome exploration state when no tests run yet and chat not started */}
        {!lastResult && !analysis && messages.length <= 1 && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5 space-y-1.5 text-center shadow-[0_2px_12px_rgba(139,92,246,0.12)]">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto">
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-xs font-mono font-bold text-foreground">Personal DSA Tutor • {problemTitle}</p>
            <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
              Ask anything below (e.g. &ldquo;Explain Two Sum&rdquo;, &ldquo;Why hashmap?&rdquo;), or run your code anytime to debug errors.
            </p>
          </div>
        )}

        {/* Accepted state */}
        {lastResult && lastResult.status === "Accepted" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-mono font-bold text-emerald-400">All Tests Passed! 🔥</p>
            <p className="text-xs text-muted-foreground font-sans max-w-[230px] leading-relaxed">
              Excellent work! Your solution is accepted. You can inspect complexity or advance to the next DSA challenge.
            </p>
          </div>
        )}

        {/* Failure detected — prompt interactive teaching */}
        {hasFailure && !analysis && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5 shadow-[0_2px_12px_rgba(249,115,22,0.15)]">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-bold text-orange-300">
                    {lastResult.status === "Compilation Error" ? "Compilation / Syntax Error" :
                     lastResult.status === "Runtime Error" ? "Runtime Crash Detected" :
                     lastResult.status === "Time Limit Exceeded" ? "Time Limit Exceeded (TLE)" :
                     "Wrong Answer / Failed Test"}
                  </p>
                  <p className="text-[11px] text-slate-300 font-sans mt-1 leading-relaxed">
                    Let's debug this together. AlgoMentor connects directly to your code, identifies the conceptual invariant, and guides you with interactive questions.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              className="w-full rounded-xl py-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 text-white font-mono font-bold text-xs shadow-[0_4px_18px_rgba(139,92,246,0.45)] hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span>Start Interactive Tutoring</span>
            </Button>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            <p className="text-xs font-mono text-muted-foreground">AlgoMentor is inspecting your code & mistake...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {/* Main Interactive Tutoring Workspace */}
        <AnimatePresence>
          {(analysis || messages.length > 0) && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: DUR.medium, ease: EASE }}
              className="space-y-3.5"
            >
              {/* Personalized Learning Indicator */}
              {analysis?.learning_profile?.is_personalized && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 flex items-start gap-2.5 shadow-[0_2px_10px_rgba(139,92,246,0.15)]"
                >
                  <Target className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-violet-300 uppercase tracking-wider">
                        {analysis.learning_profile.difficulty_level === "persistent"
                          ? "Foundational Review"
                          : "Targeted Concept Practice"}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-400/20 text-violet-200 border border-violet-400/30 font-medium">
                        {analysis.learning_profile.weak_topic || problemTopic}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-sans mt-1 leading-relaxed">
                      {analysis.learning_profile.message ||
                        `Adapted based on your recent practice history in ${analysis.learning_profile.weak_topic || problemTopic}.`}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Diagnosed Mistake Banner */}
              {analysis && (
                <div className={`rounded-xl border ${severity.border} ${severity.bg} p-3.5`}>
                  <div className="flex items-start gap-2.5">
                    <SeverityIcon className={`w-4 h-4 ${severity.color} shrink-0 mt-0.5`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                          Diagnosed Mistake
                        </p>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-muted-foreground border border-white/10 uppercase">
                          {analysis.severity} priority
                        </span>
                      </div>
                      <p className={`text-xs font-mono font-semibold ${severity.color}`}>
                        {analysis.diagnosis}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Concept / Invariant Header */}
              {analysis && (
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">DSA Invariant:</span>
                    <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-[10px] font-mono font-medium border border-violet-500/30">
                      {analysis.concept}
                    </span>
                  </div>
                  {analysis.analogy && (
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Analogy Ready
                    </span>
                  )}
                </div>
              )}

              {/* Real-World Analogy Banner */}
              {analysis?.analogy && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 space-y-1 shadow-[0_2px_10px_rgba(6,182,212,0.1)]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                      Real-World Analogy
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {analysis.analogy}
                  </p>
                </div>
              )}

              {/* Dynamic Contextual Action Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                    Contextual Actions
                  </span>
                  <span className="text-[9px] font-mono text-violet-400">
                    Step {teachingStep}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contextualActions.map((act, i) => {
                    const isHighlight =
                      (act === "Try the Problem" && isCompleted) ||
                      (act === "Show 3D" && !isCompleted && teachingStep >= 2) ||
                      (act === "Guide Me" && messages.length <= 2);

                    return (
                      <button
                        key={i}
                        disabled={interactLoading}
                        onClick={() => handleActionClick(act)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                          isHighlight
                            ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md shadow-violet-500/25 hover:brightness-110 border border-white/20"
                            : "bg-muted/60 border border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {act === "Show 3D" && <Box className="w-3 h-3 text-cyan-500 dark:text-cyan-300" />}
                        {act === "Ask Me" && <HelpCircle className="w-3 h-3 text-violet-500 dark:text-violet-300" />}
                        {act === "Give Hint" && <Lightbulb className="w-3 h-3 text-amber-500 dark:text-amber-300" />}
                        {act === "Show Example" && <BookOpen className="w-3 h-3 text-cyan-500 dark:text-cyan-300" />}
                        {act === "Review My Code" && <Code2 className="w-3 h-3 text-emerald-500 dark:text-emerald-300" />}
                        {act === "Try the Problem" && <Flame className="w-3 h-3 text-amber-500 dark:text-amber-300" />}
                        <span>{act}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Teaching Workspace Mode Switcher */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-muted/50 rounded-xl border border-border text-center">
                <button
                  onClick={() => setActiveTab("guide")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                    activeTab === "guide"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  Tutor Dialogue
                </button>
                <button
                  onClick={() => setActiveTab("example")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                    activeTab === "example"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  Micro-Example
                </button>
                <button
                  onClick={() => setActiveTab("levels")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                    activeTab === "levels"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  Levels (1-6)
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                    activeTab === "code"
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  My Code Line
                </button>
              </div>

              {/* TAB 1: SOCRATIC TUTOR DIALOGUE */}
              {activeTab === "guide" && (
                <div className="space-y-3">
                  {/* Dialogue Message History */}
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col ${
                          msg.role === "student" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                            msg.role === "student"
                              ? "bg-violet-600/30 border border-violet-500/40 text-violet-950 dark:text-violet-100 rounded-br-none"
                              : "bg-card border border-border text-foreground rounded-bl-none shadow-sm"
                          }`}
                        >
                          {/* Role Header */}
                          <div className="flex items-center gap-1.5 mb-1">
                            {msg.role === "student" ? (
                              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-300 font-bold">You</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-violet-600 dark:text-violet-300 font-bold">AlgoMentor</span>
                                {msg.evaluation && (
                                  <span
                                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                      msg.evaluation === "correct"
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                                        : msg.evaluation === "partially_correct"
                                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                                        : "bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30"
                                    }`}
                                  >
                                    {msg.evaluation === "correct" ? "Correct" : msg.evaluation === "partially_correct" ? "Close" : "Guiding"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <p className="whitespace-pre-line font-sans">{msg.content}</p>

                          {/* Auto-Voice status indicator for tutor messages */}
                          {msg.role === "tutor" && (
                            <div className="pt-1.5 mt-2 border-t border-border/40">
                              {voiceState.messageId === msg.id && voiceState.status === "preparing" && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-violet-500 dark:text-violet-400">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>🔊 Preparing voice...</span>
                                </div>
                              )}

                              {voiceState.messageId === msg.id && voiceState.status === "speaking" && (
                                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-500 dark:text-emerald-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="font-semibold">🔊 Speaking...</span>
                                  </div>
                                  <button
                                    onClick={() => stopActiveVoice()}
                                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                                    title="Stop voice"
                                  >
                                    <VolumeX className="w-3 h-3" />
                                    <span>Stop</span>
                                  </button>
                                </div>
                              )}

                              {voiceState.messageId === msg.id && voiceState.status === "blocked" && (
                                <div className="flex items-center justify-between text-[10px] font-mono text-amber-500">
                                  <span>Autoplay blocked</span>
                                  <button
                                    onClick={async () => {
                                      if (currentAudioRef.current) {
                                        try {
                                          await currentAudioRef.current.play();
                                          setVoiceState({ messageId: msg.id, status: "speaking" });
                                          return;
                                        } catch (e) {
                                          console.warn(e);
                                        }
                                      }
                                      startVoicePlayback(msg.id, msg.content);
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors font-semibold"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    <span>Tap to play</span>
                                  </button>
                                </div>
                              )}

                              {voiceState.messageId === msg.id && voiceState.status === "error" && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                                  <VolumeX className="w-3 h-3 opacity-60" />
                                  <span className="opacity-75">{voiceState.error || "Voice unavailable"}</span>
                                </div>
                              )}

                              {/* Idle or Finished: subtle replay control */}
                              {(voiceState.messageId !== msg.id || voiceState.status === "finished" || voiceState.status === "idle") && (
                                <div className="flex items-center justify-end text-[10px] font-mono text-muted-foreground">
                                  <button
                                    onClick={() => {
                                      stopActiveVoice();
                                      startVoicePlayback(msg.id, msg.content);
                                    }}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Listen to voice explanation"
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    <span>Replay</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Active Question Card (Interactive Socratic Question) */}
                  {currentQuestion && !isCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-violet-500/40 bg-card p-3.5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                        <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-300 uppercase tracking-wider">
                          Intuition Challenge
                        </span>
                      </div>

                      <p className="text-xs font-sans text-foreground font-medium leading-relaxed">
                        {currentQuestion.prompt}
                      </p>

                      {/* Clickable Quick Option Chips */}
                      {currentQuestion.options && currentQuestion.options.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {currentQuestion.options.map((opt, idx) => (
                            <button
                              key={idx}
                              disabled={interactLoading}
                              onClick={() => {
                                setSelectedOption(opt);
                                handleAnswerSubmit(opt.label);
                              }}
                              className="w-full text-left p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-violet-600/20 hover:border-violet-500/40 text-xs font-mono transition-all flex items-center justify-between gap-2 text-slate-200"
                            >
                              <span>{opt.label}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Concept Mastered / Learning Completion Card */}
                  {isCompleted && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 text-center shadow-[0_4px_20px_rgba(16,185,129,0.2)]"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
                          Concept Mastered! 🔥
                        </p>
                        <p className="text-xs text-slate-200 font-sans mt-1 leading-relaxed">
                          You've identified the core invariant and algorithmic pattern. Ready to put it into code!
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1 justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleActionClick("Try the Problem")}
                          className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-mono text-xs font-bold px-4"
                        >
                          <Flame className="w-3.5 h-3.5 mr-1" />
                          Try the Problem
                        </Button>
                        {analysis?.visualization && onOpen3DExplanation && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpen3DExplanation(analysis.visualization!)}
                            className="rounded-xl border-white/20 text-xs font-mono text-cyan-300"
                          >
                            <Box className="w-3.5 h-3.5 mr-1" />
                            Show 3D Model
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Persistent Student Chat & Question Input */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
                    <input
                      type="text"
                      value={studentInput}
                      disabled={interactLoading}
                      onChange={(e) => setStudentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && studentInput.trim()) {
                          handleAnswerSubmit(studentInput);
                        }
                      }}
                      placeholder={
                        currentQuestion
                          ? "Answer or ask (e.g. Why hashmap?, Give me a real-life example)..."
                          : "Ask AlgoMentor (e.g. Explain Two Sum, Why hashmap?)..."
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500 shadow-inner"
                    />
                    <Button
                      size="sm"
                      disabled={!studentInput.trim() || interactLoading}
                      onClick={() => handleAnswerSubmit(studentInput)}
                      className="h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono shrink-0 shadow-sm"
                    >
                      {interactLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 2: MICRO-EXAMPLE STEP-BY-STEP TRACE */}
              {activeTab === "example" && (
                <div className="space-y-3">
                  {analysis?.micro_example ? (
                    <div className="rounded-xl border border-cyan-500/30 bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-300">
                            {analysis.micro_example.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/30">
                          Step {microStep + 1} of {analysis.micro_example.steps.length}
                        </span>
                      </div>

                      {analysis.micro_example.input_data && (
                        <div className="rounded-lg bg-background p-2 border border-border">
                          <span className="text-[10px] font-mono text-muted-foreground block mb-0.5">Input:</span>
                          <span className="text-xs font-mono text-foreground">{analysis.micro_example.input_data}</span>
                        </div>
                      )}

                      {analysis.micro_example.steps[microStep] && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2 rounded bg-white/5 border border-white/10">
                              <span className="text-[9px] text-muted-foreground block">Current State</span>
                              <span className="text-violet-300 font-semibold">{analysis.micro_example.steps[microStep].current}</span>
                            </div>
                            <div className="p-2 rounded bg-white/5 border border-white/10">
                              <span className="text-[9px] text-muted-foreground block">Needed Complement / Check</span>
                              <span className="text-cyan-300 font-semibold">{analysis.micro_example.steps[microStep].needed}</span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-950/20 space-y-2">
                            <p className="text-xs font-mono font-semibold text-slate-200">
                              {analysis.micro_example.steps[microStep].question}
                            </p>

                            <div className="flex items-center gap-2">
                              {analysis.micro_example.steps[microStep].options.map((opt, oIdx) => {
                                const isCorrect = opt === analysis.micro_example!.steps[microStep].correct_option;
                                const isSelected = selectedMicroOption === opt;
                                let btnColor = "border-white/10 bg-white/5 hover:bg-white/10 text-slate-200";
                                if (isSelected) {
                                  btnColor = isCorrect
                                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                                    : "border-rose-500/50 bg-rose-500/20 text-rose-200";
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setSelectedMicroOption(opt)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${btnColor}`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {selectedMicroOption && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[11px] font-sans text-slate-300 pt-1 leading-relaxed"
                              >
                                <span className="font-mono font-bold text-cyan-300 mr-1">Explanation:</span>
                                {analysis.micro_example.steps[microStep].explanation}
                              </motion.div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={microStep === 0}
                              onClick={() => {
                                setMicroStep((s) => s - 1);
                                setSelectedMicroOption(null);
                              }}
                              className="text-xs font-mono text-muted-foreground h-7"
                            >
                              ← Previous
                            </Button>

                            {microStep < analysis.micro_example.steps.length - 1 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setMicroStep((s) => s + 1);
                                  setSelectedMicroOption(null);
                                }}
                                className="text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white h-7"
                              >
                                Next Step →
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (analysis.visualization && onOpen3DExplanation) {
                                    onOpen3DExplanation(analysis.visualization);
                                  }
                                }}
                                className="text-xs font-mono bg-gradient-to-r from-violet-600 to-cyan-600 text-white h-7"
                              >
                                View in 3D →
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs font-mono text-muted-foreground">
                      No micro-example available for this problem.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PROGRESSIVE LEVELS (1 to 6) */}
              {activeTab === "levels" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border overflow-x-auto">
                    {[1, 2, 3, 4, 5, 6].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setActiveLevel(lvl)}
                        className={`flex-1 min-w-[45px] py-1 text-center rounded text-[10px] font-mono font-bold transition-all ${
                          activeLevel === lvl
                            ? "bg-violet-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        L{lvl}: {lvl === 1 ? "Question" : lvl === 2 ? "Hint" : lvl === 3 ? "Example" : lvl === 4 ? "Concept" : lvl === 5 ? "3D" : "Code"}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3.5">
                    {activeLevel === 1 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase">Level 1: Guiding Question</span>
                        <p className="text-xs font-mono text-amber-700 dark:text-amber-200/90 leading-relaxed">
                          {currentQuestion?.prompt || "Ask yourself: what counterpart value do you need for each element to reach target?"}
                        </p>
                      </div>
                    )}
                    {activeLevel === 2 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">Level 2: Small Hint</span>
                        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-200/90 leading-relaxed">
                          {analysis?.hint || "Consider keeping track of items you have seen in a hash structure for instant lookup."}
                        </p>
                      </div>
                    )}
                    {activeLevel === 3 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 font-bold uppercase">Level 3: Micro-Example</span>
                        <p className="text-xs font-sans text-foreground">
                          {analysis?.micro_example?.title || "Walk through a minimal 2-3 element case step-by-step."}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setActiveTab("example")}
                          className="text-xs font-mono bg-violet-600 text-white h-7 mt-1"
                        >
                          Launch Micro-Example
                        </Button>
                      </div>
                    )}
                    {activeLevel === 4 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase">Level 4: Concept Explanation</span>
                        <p className="text-xs font-sans text-foreground leading-relaxed">
                          {analysis?.explanation || "AlgoMentor provides step-by-step hints and concept intuition."}
                        </p>
                        {analysis?.analogy && (
                          <p className="text-xs text-cyan-600 dark:text-cyan-300 font-sans italic mt-1">{analysis.analogy}</p>
                        )}
                      </div>
                    )}
                    {activeLevel === 5 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase">Level 5: 3D Visualization</span>
                        <p className="text-xs font-sans text-foreground">
                          Visualize pointers, boundary updates, and state transitions in our real-time 3D engine.
                        </p>
                        {analysis?.visualization && onOpen3DExplanation && (
                          <Button
                            size="sm"
                            onClick={() => onOpen3DExplanation(analysis.visualization!)}
                            className="text-xs font-mono bg-gradient-to-r from-violet-600 to-cyan-600 text-white h-7 mt-1"
                          >
                            Open 3D Model Explainer
                          </Button>
                        )}
                      </div>
                    )}
                    {activeLevel === 6 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold uppercase">Level 6: Detailed Code Guidance</span>
                        <p className="text-xs font-sans text-foreground">
                          {analysis?.code_reference?.observation || "Ensure your loop invariant guards all test constraints."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CODE-LINKED TEACHING (Real line from student's code) */}
              {activeTab === "code" && (
                <div className="space-y-3">
                  {analysis?.code_reference ? (
                    <div className="rounded-xl border border-amber-500/30 bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-300">Code-Linked Reference</span>
                        </div>
                        {analysis.code_reference.line_number && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold">
                            Line {analysis.code_reference.line_number}
                          </span>
                        )}
                      </div>

                      {analysis.code_reference.code_snippet && (
                        <pre className="p-3 rounded-lg bg-background font-mono text-xs text-emerald-600 dark:text-emerald-300 overflow-x-auto border border-border">
                          {analysis.code_reference.code_snippet}
                        </pre>
                      )}

                      <p className="text-xs text-foreground font-sans leading-relaxed">
                        {analysis.code_reference.observation}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs font-mono text-muted-foreground">
                      No specific line flagged. Review your overall iteration logic.
                    </div>
                  )}
                </div>
              )}

              {/* 3D Model Explainer Button */}
              {analysis?.visualization && onOpen3DExplanation && (
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                >
                  <Button
                    onClick={() => onOpen3DExplanation(analysis.visualization!)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 text-white font-mono font-bold text-xs shadow-[0_4px_20px_rgba(139,92,246,0.45)] hover:brightness-110 hover:shadow-[0_6px_24px_rgba(139,92,246,0.6)] transition-all flex items-center justify-center gap-2 border border-white/20"
                  >
                    <Box className="w-4 h-4 text-cyan-200 animate-pulse" />
                    <span>Show 3D Explanation</span>
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />
                  </Button>
                </motion.div>
              )}

              {/* Re-analyze Button */}
              {hasFailure && (
                <Button
                  onClick={handleAnalyze}
                  variant="outline"
                  className="w-full rounded-xl py-2 border-white/10 text-xs font-mono hover:bg-white/5"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Re-analyze After Code Changes
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
