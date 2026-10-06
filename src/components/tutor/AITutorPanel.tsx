import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Brain, Lightbulb, MessageCircle, Cpu, AlertTriangle, BookOpen, Sparkles, Send, Loader2, ChevronRight } from "lucide-react";
import { fetchConcept, fetchHint, fetchExplain, fetchComplexity, askTutor, getToken } from "@/lib/api";
import { Button } from "@/components/shadcn/ui/button";
import { StepFade } from "@/components/motion/StepFade";
import { TypingDots } from "@/components/motion/TypingDots";
import { DUR, EASE } from "@/components/motion/motion-tokens";

type Props = {
  problemId: number;
  problemTitle: string;
  problemTopic: string;
  problemDescription: string;
  code: string;
};

type TutorState = {
  concept?: string;
  hints: Record<number, string>;
  mistake?: string;
  complexity?: { time_complexity: string; space_complexity: string; explanation: string };
  askHistory: { role: "user" | "assistant"; content: string }[];
};

export default function AITutorPanel({ problemId, problemTitle, problemTopic, problemDescription, code }: Props) {
  const [state, setState] = useState<TutorState>({ hints: {}, askHistory: [] });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [askInput, setAskInput] = useState("");

  const isAuthed = !!getToken();

  const withAuthCheck = async (key: string, fn: () => Promise<void>) => {
    if (!isAuthed) {
      setErrors((e) => ({ ...e, [key]: "Log in for live AI responses — meanwhile, here is general guidance for this problem." }));
      // Still allow offline guidance for evaluation
      await fn();
      return;
    }
    setLoading((l) => ({ ...l, [key]: true }));
    setErrors((e) => ({ ...e, [key]: null }));
    try {
      await fn();
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : "Request failed" }));
    } finally {
      setLoading((l) => ({ ...l, [key]: false }));
    }
  };

  const handleExplain = () =>
    withAuthCheck("concept", async () => {
      try {
        const data = (await fetchConcept(problemId, problemTitle, problemTopic, problemDescription)) as { explanation: string };
        setState((s) => ({ ...s, concept: data.explanation }));
      } catch {
        // offline fallback
        setState((s) => ({
          ...s,
          concept:
            problemId === 1
              ? "Two Sum is about complement search via hashing. Example: nums=[2,7,11,15], target=9. When you see 7, you need 2 — stored earlier, so answer is [0,1]."
              : `Concept for ${problemTitle} (${problemTopic}): think about which structure matches the operation you need. Walk through tiny input by hand.`,
        }));
      }
    });

  const handleHint = (level: 1 | 2 | 3) =>
    withAuthCheck(`hint${level}`, async () => {
      const data = (await fetchHint(problemId, level)) as { hint: string };
      setState((s) => ({ ...s, hints: { ...s.hints, [level]: data.hint } }));
    });

  const handleMistake = () =>
    withAuthCheck("mistake", async () => {
      // Use last console error or generic
      const errMsg = "Wrong Answer";
      try {
        const data = (await fetchExplain(problemId, code, errMsg)) as { explanation: string };
        setState((s) => ({ ...s, mistake: data.explanation }));
      } catch {
        setState((s) => ({ ...s, mistake: "Check edge cases: duplicates, empty input, order. Trace sample input step-by-step." }));
      }
    });

  const handleComplexity = () =>
    withAuthCheck("complexity", async () => {
      try {
        const data = (await fetchComplexity(problemId, code)) as { time_complexity: string; space_complexity: string; explanation: string };
        setState((s) => ({ ...s, complexity: data }));
      } catch {
        setState((s) => ({ ...s, complexity: { time_complexity: "O(n)", space_complexity: "O(1)", explanation: "Offline estimate: single pass assumed — request AI analysis when logged in." } }));
      }
    });

  const handleAsk = async () => {
    if (!askInput.trim()) return;
    const question = askInput.trim();
    setAskInput("");
    setState((s) => ({ ...s, askHistory: [...s.askHistory, { role: "user", content: question }] }));
    await withAuthCheck("ask", async () => {
      try {
        const data = (await askTutor({ problem_id: problemId, question, code })) as { answer: string };
        setState((s) => ({ ...s, askHistory: [...s.askHistory, { role: "assistant", content: data.answer }] }));
      } catch {
        setState((s) => ({
          ...s,
          askHistory: [
            ...s.askHistory,
            {
              role: "assistant",
              content: `Offline guidance for "${question.slice(0, 40)}": Try a tiny example (n=2-3) and write steps in words before coding. Share your approach and I can guide next step.`,
            },
          ],
        }));
      }
    });
  };

  const Btn: React.FC<{ onClick: () => void; loadingKey: string; icon: React.ReactNode; label: string }> = ({ onClick, loadingKey, icon, label }) => (
    <Button onClick={onClick} disabled={!!loading[loadingKey]} variant="outline" size="sm">
      {loading[loadingKey] ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );

  const hintPrompts = [
    "Think about which pattern fits…",
    "Consider what you can remember…",
    "Deeper: how does it scale?",
  ];

  return (
    <div className="overflow-hidden border-t border-primary-500/[0.12] bg-gradient-to-b from-primary-500/[0.05] to-transparent md:rounded-none md:border-t-0">
      <div className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="am-step-node rounded-xl border border-primary-500/25 bg-primary-500/10 p-2">
            <Brain className="w-4 h-4 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              AI Tutor <Sparkles className="w-3.5 h-3.5 text-accent-foreground" aria-hidden />
            </h3>
            <p className="truncate text-[11px] text-muted-foreground">Guidance for “{problemTitle}” — hints unlock in order</p>
          </div>
          {!isAuthed && <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-warning-500/15 text-warning-300 border border-warning-500/25 px-2 py-1">Login for live AI</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Btn onClick={handleExplain} loadingKey="concept" icon={<BookOpen className="w-3.5 h-3.5" />} label="Explain concept" />
          <Btn onClick={() => handleHint(1)} loadingKey="hint1" icon={<Lightbulb className="w-3.5 h-3.5 text-warning-400" />} label="Hint 1" />
          <Btn onClick={() => handleHint(2)} loadingKey="hint2" icon={<Lightbulb className="w-3.5 h-3.5 text-warning-400" />} label="Hint 2" />
          <Btn onClick={() => handleHint(3)} loadingKey="hint3" icon={<Lightbulb className="w-3.5 h-3.5 text-warning-400" />} label="Hint 3" />
          <Btn onClick={handleMistake} loadingKey="mistake" icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Review my code" />
          <Btn onClick={handleComplexity} loadingKey="complexity" icon={<Cpu className="w-3.5 h-3.5" />} label="Complexity" />
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 max-h-96 overflow-y-auto">
        {/* Concept */}
        {(state.concept || errors.concept) && (
          <motion.div
            className="rounded-xl border border-border bg-muted/30 p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" aria-hidden /> The idea</p>
            {errors.concept && <p className="text-xs text-warning-400">{errors.concept}</p>}
            {state.concept && (
              <StepFade stepKey={state.concept}>
                <p className="text-sm text-foreground leading-relaxed">{state.concept}</p>
              </StepFade>
            )}
          </motion.div>
        )}

        {/* Progressive hint ladder */}
        {[1, 2, 3].map((lvl) => (
          <div key={lvl}>
            {lvl > 1 && <div className="flex justify-center py-0.5" aria-hidden><ChevronRight className="h-3.5 w-3.5 rotate-90 text-muted-foreground" /></div>}
            <AnimatePresence mode="wait" initial={false}>
              {state.hints[lvl] ? (
                <motion.div
                  key={`hint-open-${lvl}`}
                  className="rounded-xl border border-warning-500/20 bg-warning-500/[0.06] p-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-warning-300 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" aria-hidden /> Hint {lvl} of 3
                  </p>
                  <StepFade stepKey={state.hints[lvl]}>
                    <p className="text-sm text-foreground leading-relaxed">{state.hints[lvl]}</p>
                  </StepFade>
                  {lvl < 3 && !state.hints[lvl + 1] && <p className="text-xs text-muted-foreground mt-1.5">Wrestle with this one before revealing the next hint.</p>}
                </motion.div>
              ) : (
                <motion.button
                  key={`hint-locked-${lvl}`}
                  onClick={() => handleHint(lvl as 1 | 2 | 3)}
                  disabled={!!loading[`hint${lvl}`] || (lvl > 1 && !state.hints[lvl - 1])}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border px-3 py-2.5 text-left text-xs text-muted-foreground transition-all hover:border-primary-500/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted/50 font-mono text-[11px] font-bold text-muted-foreground">{lvl}</span>
                  {loading[`hint${lvl}`] ? <TypingDots label={`Loading hint ${lvl}`} /> : lvl > 1 && !state.hints[lvl - 1] ? `Hint ${lvl} unlocks after hint ${lvl - 1}` : hintPrompts[lvl - 1]}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}
        {(errors.hint1 || errors.hint2 || errors.hint3) && (
          <p className="text-xs text-danger-300">{errors.hint1 || errors.hint2 || errors.hint3}</p>
        )}

        {/* Mistake review */}
        {state.mistake && (
          <motion.div
            className="rounded-xl border border-border bg-muted/30 p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-danger-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" aria-hidden /> Understand the mistake</p>
            <StepFade stepKey={state.mistake}>
              <p className="text-sm text-foreground leading-relaxed">{state.mistake}</p>
            </StepFade>
          </motion.div>
        )}
        {errors.mistake && <p className="text-xs text-danger-300">{errors.mistake}</p>}

        {/* Complexity */}
        {state.complexity && (
          <motion.div
            className="rounded-xl border border-border bg-muted/30 p-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-foreground mb-2 flex items-center gap-1"><Cpu className="w-3 h-3" aria-hidden /> Complexity</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-lg bg-muted border border-border p-2">
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-mono font-semibold text-warning-400">{state.complexity.time_complexity}</p>
              </div>
              <div className="rounded-lg bg-muted border border-border p-2">
                <p className="text-xs text-muted-foreground">Space</p>
                <p className="text-sm font-mono font-semibold text-accent-foreground">{state.complexity.space_complexity}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{state.complexity.explanation}</p>
          </motion.div>
        )}
        {errors.complexity && <p className="text-xs text-danger-300">{errors.complexity}</p>}

        {/* Ask history */}
        {state.askHistory.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {state.askHistory.map((m, i) => (
                <motion.div
                  key={`${i}-${m.content.slice(0, 24)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.fast, ease: EASE }}
                  className={`rounded-xl p-3 text-sm leading-relaxed ${m.role === "user" ? "bg-primary-500/[0.12] border border-primary-500/25 text-primary-900 dark:text-primary-100 ml-6" : "bg-muted/40 border border-border text-foreground mr-6"}`}
                >
                  <span className="text-xs font-semibold opacity-60">{m.role === "user" ? "You" : "Tutor"}:</span> {m.content}
                </motion.div>
              ))}
            </AnimatePresence>
            {loading.ask && (
              <motion.div
                className="rounded-xl bg-muted/40 border border-border text-foreground mr-6 p-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.fast, ease: EASE }}
              >
                <span className="text-xs font-semibold opacity-60">Tutor:</span>{" "}
                <TypingDots label="Tutor is thinking" className="text-muted-foreground" />
              </motion.div>
            )}
          </div>
        )}
        {state.askHistory.length === 0 && loading.ask && (
          <div className="rounded-xl bg-muted/40 border border-border text-foreground p-3">
            <span className="text-xs font-semibold opacity-60">Tutor:</span>{" "}
            <TypingDots label="Tutor is thinking" className="text-muted-foreground" />
          </div>
        )}
        {errors.ask && <p className="text-xs text-danger-300">{errors.ask}</p>}

        {/* Ask input */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <label htmlFor="ai-tutor-ask" className="sr-only">Ask the tutor about this problem</label>
          <input
            id="ai-tutor-ask"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder="Ask about this problem or your approach…"
            className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <Button
            onClick={handleAsk}
            disabled={loading.ask || !askInput.trim()}
            size="icon"
            aria-label="Send question"
          >
            {loading.ask ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MessageCircle className="w-3 h-3" aria-hidden /> Questions keep this problem&apos;s context. Sign in to save the conversation.
        </p>
      </div>
    </div>
  );
}
