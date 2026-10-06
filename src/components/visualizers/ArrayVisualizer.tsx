import { useId, useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Plus, Trash2, Eye, Box, Layers } from "lucide-react";
import VisualizerControls from "./VisualizerControls";
import { attachIds } from "./stepIds";
import { StepFade } from "@/components/motion/StepFade";
import { barSpring, DUR, EASE } from "@/components/motion/motion-tokens";
import DataStructure3DCanvas from "@/components/3d/DataStructure3DCanvas";

const OP_CODE: Record<Operation, string[]> = {
  traverse: ["for i in range(n):", "visit a[i]", "done"],
  search: ["for i in range(n):", "if a[i] == x: return i", "not found"],
  insert: ["shift a[idx:] right", "a[idx] = x", "done"],
  delete: ["mark a[idx]", "shift left to fill gap", "done"],
};

type Operation = "traverse" | "search" | "insert" | "delete";
type ArrayStep = {
  array: number[];
  active: number[];
  found: number[];
  description: string;
};

function buildSteps(op: Operation, base: number[], value: number, index: number): ArrayStep[] {
  const steps: ArrayStep[] = [];
  if (op === "traverse") {
    steps.push({ array: [...base], active: [], found: [], description: `Start traversal of [${base.join(", ")}]. Visit each element in order.` });
    for (let i = 0; i < base.length; i++) {
      steps.push({ array: [...base], active: [i], found: [], description: `Visiting index ${i} → value ${base[i]}.` });
    }
    steps.push({ array: [...base], active: [], found: [], description: `Traversal complete. Visited ${base.length} elements. Time O(n).` });
  } else if (op === "search") {
    steps.push({ array: [...base], active: [], found: [], description: `Search for ${value} with linear scan.` });
    let found = -1;
    for (let i = 0; i < base.length; i++) {
      steps.push({ array: [...base], active: [i], found: [], description: `Compare arr[${i}] (${base[i]}) with ${value}.` });
      if (base[i] === value) {
        found = i;
        steps.push({ array: [...base], active: [], found: [i], description: `Found ${value} at index ${i}! O(n) worst case, O(1) best.` });
        break;
      }
    }
    if (found === -1) steps.push({ array: [...base], active: [], found: [], description: `${value} not found after scanning all ${base.length} elements.` });
  } else if (op === "insert") {
    const idx = Math.max(0, Math.min(index, base.length));
    steps.push({ array: [...base], active: [], found: [], description: `Insert ${value} at index ${idx}. Shift elements from ${idx} right.` });
    const after = [...base.slice(0, idx), value, ...base.slice(idx)];
    for (let i = base.length; i > idx; i--) {
      steps.push({ array: [...after], active: [i], found: [], description: `Shift arr[${i - 1}] to index ${i}.` });
    }
    steps.push({ array: after, active: [idx], found: [idx], description: `Inserted ${value} at index ${idx}. New array [${after.join(", ")}]. O(n) time.` });
  } else if (op === "delete") {
    const idx = Math.max(0, Math.min(index, base.length - 1));
    const val = base[idx];
    steps.push({ array: [...base], active: [], found: [], description: `Delete element at index ${idx} (value ${val}). Shift left to fill gap.` });
    steps.push({ array: [...base], active: [idx], found: [], description: `Mark index ${idx} for deletion.` });
    const after = base.filter((_, i) => i !== idx);
    steps.push({ array: after, active: [], found: [], description: `Deleted. New array [${after.join(", ")}]. O(n) time.` });
  }
  return steps;
}

export default function ArrayVisualizer() {
  const [baseArray, setBaseArray] = useState<number[]>([7, 2, 9, 4, 1, 6]);
  const [inputArray, setInputArray] = useState("7,2,9,4,1,6");
  const [operation, setOperation] = useState<Operation>("traverse");
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [value, setValue] = useState(4);
  const [index, setIndex] = useState(2);
  const [steps, setSteps] = useState<ArrayStep[]>(() => buildSteps("traverse", [7, 2, 9, 4, 1, 6], 4, 2));
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const timerRef = useRef<number | null>(null);

  const applyInputArray = () => {
    const parsed = inputArray
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n))
      .slice(0, 12);
    if (parsed.length) {
      setBaseArray(parsed);
      const newSteps = buildSteps(operation, parsed, value, index);
      setSteps(newSteps);
      setCurrent(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const newSteps = buildSteps(operation, baseArray, value, index);
    setSteps(newSteps);
    setCurrent(0);
    setIsPlaying(false);
  }, [operation]);

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

  const rebuild = () => {
    const newSteps = buildSteps(operation, baseArray, value, index);
    setSteps(newSteps);
    setCurrent(0);
    setIsPlaying(false);
  };

  const codeId = useId();
  const stepsWithIds = useMemo(() => attachIds(steps), [steps]);
  const step = stepsWithIds[current] ?? stepsWithIds[0];
  const runKey = `${operation}:${stepsWithIds.length}:${stepsWithIds[0]?.array.join(",") ?? ""}`;
  const maxVal = Math.max(...step.array, 1);
  const codeLines = OP_CODE[operation];
  const activeLine =
    current === 0 ? 0 : step.found.length > 0 ? 1 : step.active.length > 0 ? 1 : codeLines.length - 1;

  return (
    <div className="space-y-4">
      {/* Controls Bar & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-white/5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <label className="text-xs font-mono font-medium text-muted-foreground">ARRAY</label>
          <input
            value={inputArray}
            onChange={(e) => setInputArray(e.target.value)}
            className="flex-1 min-w-32 px-3 py-1.5 rounded-lg bg-background/80 border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="e.g. 7,2,9,4,1,6"
          />
          <button
            onClick={applyInputArray}
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-accent text-xs font-medium text-foreground transition-colors border border-white/5"
          >
            Apply
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 3D vs 2D Toggle */}
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

          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as Operation)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none"
          >
            <option value="traverse">Traversal</option>
            <option value="search">Search</option>
            <option value="insert">Insert</option>
            <option value="delete">Delete</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(operation === "search" || operation === "insert") && (
          <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            Target Value:
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-20 px-2.5 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none font-mono"
            />
          </label>
        )}
        {(operation === "insert" || operation === "delete") && (
          <label className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            Target Index:
            <input
              type="number"
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              className="w-20 px-2.5 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/60 outline-none font-mono"
              min={0}
              max={baseArray.length}
            />
          </label>
        )}
        <button
          onClick={rebuild}
          className="ml-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-primary-600 to-accent-600 hover:brightness-110 text-xs font-medium text-white flex items-center gap-1.5 shadow-[0_4px_16px_-4px_rgba(99,102,241,0.5)] active:translate-y-px transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> Preview Steps
        </button>
      </div>

      {/* Code trace — highlight follows execution */}
      <div className="rounded-xl border border-white/10 bg-abyss-900/80 backdrop-blur-md p-3.5 shadow-lg" aria-label="Operation code trace">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary-300">
            {operation} · LINE {activeLine + 1}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            Step {current + 1} of {steps.length}
          </span>
        </div>
        <div className="space-y-1 font-mono text-xs">
          {codeLines.map((line, i) => (
            <div
              key={i}
              className={`relative rounded-lg px-3 py-1.5 transition-colors ${
                i === activeLine ? "text-foreground font-semibold" : "text-muted-foreground/70"
              }`}
              aria-current={i === activeLine ? "true" : undefined}
            >
              {i === activeLine && (
                <motion.span
                  layoutId={`array-code-${codeId}`}
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
          activeIndices={step.active}
          foundIndices={step.found}
          currentOperation={operation}
          stepDescription={step.description}
        />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-abyss-900/90 to-abyss-950 p-5 shadow-xl overflow-x-auto">
          <div className="flex items-end gap-2.5 min-h-28">
            <AnimatePresence mode="popLayout" initial={false}>
              {step.ids.map((id, idx) => {
                const val = step.array[idx];
                const isActive = step.active.includes(idx);
                const isFound = step.found.includes(idx);
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
                      isFound
                        ? "bg-gradient-to-t from-success-500/30 to-success-500/10 border-success-500/60 text-success-300 shadow-[0_0_16px_rgba(34,197,94,0.3)]"
                        : isActive
                        ? "bg-gradient-to-t from-primary-500/40 to-accent-500/20 border-cyan-400/60 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                        : "bg-surface-800/80 border-white/10 text-foreground"
                    }`}
                    aria-label={`Index ${idx} value ${val}${isActive ? " active" : ""}${isFound ? " found" : ""}`}
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
              const isActive = step.active.includes(idx);
              const isFound = step.found.includes(idx);
              return (
                <span
                  key={idx}
                  className={`flex-1 min-w-11 text-center text-xs font-mono font-semibold ${
                    isFound ? "text-success-400" : isActive ? "text-cyan-400" : "text-muted-foreground/60"
                  }`}
                >
                  [{idx}]
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground border-t border-white/5 pt-3">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> Active
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Found/Inserted
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
            <Search className="w-3 h-3 text-primary-400" /> {operation}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
            Step {current + 1} / {steps.length}
          </span>
          {operation === "insert" && (
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-cyan-300 flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Insert
            </span>
          )}
          {operation === "delete" && (
            <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-red-300 flex items-center gap-1.5">
              <Trash2 className="w-3 h-3" /> Delete
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
