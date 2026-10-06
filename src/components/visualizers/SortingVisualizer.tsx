import { useId, useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Box, Layers, Play, RotateCcw } from "lucide-react";
import VisualizerControls from "./VisualizerControls";
import { attachIds } from "./stepIds";
import {
  generateSteps,
  type SortType,
  type SortStep,
} from "./sortingAlgorithms";
import { StepFade } from "@/components/motion/StepFade";
import { barSpring, DUR, EASE } from "@/components/motion/motion-tokens";
import DataStructure3DCanvas from "@/components/3d/DataStructure3DCanvas";

const SORT_META: Record<SortType, { label: string; bestTime: string; avgTime: string; worstTime: string; space: string }> = {
  bubble: { label: "Bubble Sort", bestTime: "O(n)", avgTime: "O(n²)", worstTime: "O(n²)", space: "O(1)" },
  selection: { label: "Selection Sort", bestTime: "O(n²)", avgTime: "O(n²)", worstTime: "O(n²)", space: "O(1)" },
  insertion: { label: "Insertion Sort", bestTime: "O(n)", avgTime: "O(n²)", worstTime: "O(n²)", space: "O(1)" },
};

const SORT_CODE: Record<SortType, string[]> = {
  bubble: ["for i in range(n-1):", "  for j in range(n-1-i):", "    if a[j] > a[j+1]: swap(a[j], a[j+1])", "done"],
  selection: ["for i in range(n-1):", "  min_idx = i", "  for j in range(i+1, n):", "    if a[j] < a[min]: min_idx = j", "  swap(a[i], a[min_idx])", "done"],
  insertion: ["for i in range(1, n):", "  key = a[i]", "  while j >= 0 and a[j] > key:", "    a[j+1] = a[j]", "  a[j+1] = key", "done"],
};

function activeCodeLine(type: SortType, step: SortStep, current: number): number {
  if (current === 0) return 0;
  if (step.swapping && step.swapping.length > 0) return 2;
  if (step.comparing && step.comparing.length > 0) return 1;
  return SORT_CODE[type].length - 1;
}

interface SortingVisualizerProps {
  initialType?: SortType;
}

export default function SortingVisualizer({ initialType = "bubble" as SortType }: SortingVisualizerProps) {
  const [sortType, setSortType] = useState<SortType>(initialType);
  const [input, setInput] = useState("5,2,9,1,7,3");
  const [array, setArray] = useState<number[]>([5, 2, 9, 1, 7, 3]);
  const [steps, setSteps] = useState<SortStep[]>(() => generateSteps(initialType, [5, 2, 9, 1, 7, 3]));
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const timerRef = useRef<number | null>(null);

  const apply = () => {
    const parsed = input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n))
      .slice(0, 20);
    if (!parsed.length) return;
    setArray(parsed);
    const s = generateSteps(sortType, parsed);
    setSteps(s);
    setCurrent(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    const s = generateSteps(sortType, array);
    setSteps(s);
    setCurrent(0);
    setIsPlaying(false);
  }, [sortType]);

  useEffect(() => {
    if (!isPlaying) return;
    if (current >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    timerRef.current = window.setTimeout(() => setCurrent((c) => c + 1), speed);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isPlaying, current, steps.length, speed]);

  const codeId = useId();
  const stepsWithIds = useMemo(() => attachIds(steps), [steps]);
  const step = stepsWithIds[current] ?? stepsWithIds[0];
  const runKey = `${sortType}:${stepsWithIds.length}:${stepsWithIds[0]?.array.join(",") ?? ""}`;
  const maxVal = Math.max(...step.array, 1);
  const meta = SORT_META[sortType];
  const codeLines = SORT_CODE[sortType];
  const activeLine = activeCodeLine(sortType, step, current);

  return (
    <div className="space-y-4">
      {/* Algorithm Selector & View Mode */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-white/5">
        <div className="flex rounded-lg overflow-hidden border border-white/10 p-0.5 bg-background shadow-inner">
          {(Object.keys(SORT_META) as SortType[]).map((t) => (
            <button
              key={t}
              onClick={() => setSortType(t)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                sortType === t
                  ? "bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {SORT_META[t].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-48">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-mono text-foreground focus:border-primary/60 outline-none"
            placeholder="e.g. 5,2,9,1,7,3"
          />
          <button
            onClick={apply}
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-accent text-xs font-medium text-foreground transition-colors border border-white/5"
          >
            Apply
          </button>
        </div>

        {/* 3D vs 2D View Switch */}
        <div className="flex items-center p-0.5 rounded-lg bg-background border border-white/10 shadow-inner">
          <button
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === "3d"
                ? "bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Box className="w-3.5 h-3.5" /> 3D View
          </button>
          <button
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
              viewMode === "2d"
                ? "bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> 2D View
          </button>
        </div>
      </div>

      {/* Pseudo-code — highlight follows execution */}
      <div className="rounded-xl border border-white/10 bg-abyss-900/80 backdrop-blur-md p-3.5 shadow-lg" aria-label="Algorithm code trace">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary-300">
            {meta.label} · EXECUTING LINE {activeLine + 1}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div className="space-y-1 font-mono text-xs">
          {codeLines.map((line: string, i: number) => (
            <div
              key={i}
              className={`relative rounded-lg px-3 py-1.5 transition-colors ${
                i === activeLine ? "text-foreground font-semibold" : "text-muted-foreground/70"
              }`}
              aria-current={i === activeLine ? "true" : undefined}
            >
              {i === activeLine && (
                <motion.span
                  layoutId={`sort-code-${codeId}`}
                  className="absolute inset-0 rounded-lg border-l-2 border-primary bg-primary-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  transition={barSpring}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center">
                <span className="mr-3 inline-block w-4 text-right opacity-40">{i + 1}</span>
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Spatial Canvas or 2D Classic Array */}
      {viewMode === "3d" ? (
        <DataStructure3DCanvas
          array={step.array}
          comparingIndices={step.comparing}
          swappedIndices={step.swapping}
          sortedIndices={step.sorted}
          currentOperation={`${sortType} sort`}
          stepDescription={step.description}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-abyss-900/90 to-abyss-950 p-5 shadow-xl overflow-x-auto">
          <div className="flex items-end gap-2.5 min-h-28">
            <AnimatePresence mode="popLayout" initial={false}>
              {step.ids.map((id, idx) => {
                const val = step.array[idx];
                const isComparing = step.comparing.includes(idx);
                const isSwapping = step.swapping.includes(idx);
                const isSorted = step.sorted.includes(idx);
                const height = 30 + (val / maxVal) * 85;

                return (
                  <motion.div
                    key={`${runKey}:${id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      height: `${height}px`,
                    }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{
                      layout: barSpring,
                      height: { duration: DUR.fast, ease: EASE },
                      opacity: { duration: DUR.fast },
                      scale: { duration: DUR.fast },
                    }}
                    className={`flex-1 min-w-11 rounded-xl border flex items-end justify-center pb-2 pt-3 shadow-lg transition-colors ${
                      isSwapping
                        ? "bg-gradient-to-t from-violet-500/40 to-violet-500/20 border-violet-400/60 text-violet-200 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        : isComparing
                        ? "bg-gradient-to-t from-cyan-500/40 to-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                        : isSorted
                        ? "bg-gradient-to-t from-emerald-500/30 to-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                        : "bg-surface-800/80 border-white/10 text-foreground"
                    }`}
                    aria-label={`Index ${idx} value ${val}${isComparing ? " comparing" : ""}${
                      isSwapping ? " swapping" : ""
                    }${isSorted ? " sorted" : ""}`}
                  >
                    <span className="text-sm font-bold font-mono">{val}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {step.array.length === 0 && <p className="text-sm text-muted-foreground">Array is empty</p>}
          </div>

          <div className="mt-2.5 flex gap-2.5" aria-hidden>
            {step.array.map((_, idx) => {
              const isComparing = step.comparing.includes(idx);
              const isSwapping = step.swapping.includes(idx);
              const isSorted = step.sorted.includes(idx);
              return (
                <span
                  key={idx}
                  className={`flex-1 min-w-11 text-center text-xs font-mono font-semibold ${
                    isSwapping
                      ? "text-violet-400"
                      : isComparing
                      ? "text-cyan-400"
                      : isSorted
                      ? "text-emerald-400"
                      : "text-muted-foreground/60"
                  }`}
                >
                  [{idx}]
                </span>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-white/5 pt-3">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> Comparing
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" /> Swapping
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Sorted
            </span>
            <span className="ml-auto font-mono text-slate-400">n = {step.array.length}</span>
          </div>
        </div>
      )}

      <VisualizerControls
        isPlaying={isPlaying}
        canPrev={current > 0}
        canNext={current < steps.length - 1}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onPrev={() => setCurrent((c) => Math.max(0, c - 1))}
        onNext={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
        onReset={() => {
          setCurrent(0);
          setIsPlaying(false);
        }}
        currentStep={current}
        totalSteps={steps.length}
        speed={speed}
        onSpeedChange={setSpeed}
      />

      <div className="rounded-xl bg-abyss-900/60 border border-white/10 p-4 shadow-md">
        <p className="text-[10px] font-mono font-semibold text-primary-300 uppercase tracking-wider mb-1.5">
          STEP EXPLANATION
        </p>
        <StepFade stepKey={current}>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">{step.description}</p>
        </StepFade>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3 text-primary-400" /> {meta.label}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
            Step {current + 1} / {steps.length}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-300">
            Best {meta.bestTime} · Avg {meta.avgTime} · Worst {meta.worstTime}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-violet-300">
            Space {meta.space}
          </span>
        </div>
      </div>
    </div>
  );
}
