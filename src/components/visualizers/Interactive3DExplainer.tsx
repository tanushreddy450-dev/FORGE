import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Box,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";
import DataStructure3DCanvas from "@/components/3d/DataStructure3DCanvas";
import VisualizerControls from "@/components/visualizers/VisualizerControls";
import type { VisualizationData, VisualizerStep } from "@/lib/api";
import { Button } from "@/components/shadcn/ui/button";
import { DUR, EASE } from "@/components/motion/motion-tokens";
import AlgoMentorVoicePlayer from "@/components/tutor/AlgoMentorVoicePlayer";

interface Interactive3DExplainerProps {
  visualization: VisualizationData;
  onClose: () => void;
}

export default function Interactive3DExplainer({
  visualization,
  onClose,
}: Interactive3DExplainerProps) {
  const steps = visualization.steps || [];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const playTimerRef = useRef<number | null>(null);

  const step: VisualizerStep | undefined = steps[currentStepIndex];
  const totalSteps = steps.length;

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }, []);

  const handlePlay = useCallback(() => {
    if (currentStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [currentStepIndex, totalSteps]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Auto-play timer loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = window.setTimeout(() => {
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex((idx) => idx + 1);
        } else {
          setIsPlaying(false);
        }
      }, speed);
    } else if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [isPlaying, currentStepIndex, totalSteps, speed]);

  // Keyboard navigation: Space = Play/Pause, ArrowLeft = Prev, ArrowRight = Next, Esc = Close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!step || totalSteps === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="bg-surface-900 border border-white/10 rounded-2xl p-6 max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-sm font-mono font-bold text-foreground">Visualization Not Available</h3>
          <p className="text-xs text-muted-foreground">No 3D visual steps found for this concept.</p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Back to Problem
          </Button>
        </div>
      </div>
    );
  }

  const isMistakeStep =
    (step.operation || "").toLowerCase().includes("mistake") ||
    (step.description || "").toLowerCase().includes("mistake") ||
    (step.description || "").toLowerCase().includes("incorrect");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-abyss-950/95 backdrop-blur-xl text-foreground overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-surface-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="rounded-xl border border-white/10 hover:bg-white/10 text-xs font-mono font-bold flex items-center gap-1.5 text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Problem
          </Button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.4)]">
              <Box className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                {visualization.title || "Interactive 3D Model Explainer"}
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono text-[10px] border border-violet-500/30">
                  {visualization.concept}
                </span>
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex text-[11px] font-mono text-muted-foreground">
            Keys: <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-1">Space</kbd> Play/Pause &bull; <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-1">&larr; &rarr;</kbd> Steps &bull; <kbd className="px-1.5 py-0.5 rounded bg-white/10 mx-1">Esc</kbd> Close
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Stage & Educational Context */}
      <div className="flex-1 flex flex-col xl:flex-row p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: 3D Stage + Controls */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* 3D WebGL Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-violet-500/30 bg-abyss-950 shadow-[0_0_40px_rgba(139,92,246,0.15)] flex-1 min-h-[380px]">
            <DataStructure3DCanvas
              array={step.array}
              activeIndices={step.active_indices || []}
              comparingIndices={step.comparing_indices || []}
              foundIndices={step.found_indices || []}
              swappedIndices={step.swapped_indices || []}
              sortedIndices={step.sorted_indices || []}
              pointers={step.pointers || {}}
              currentOperation={step.operation}
              stepDescription={step.description}
              className="h-full min-h-[380px]"
            />
          </div>

          {/* Controls Bar */}
          <div className="rounded-2xl border border-white/10 bg-surface-900/80 p-2.5 backdrop-blur-md">
            <VisualizerControls
              isPlaying={isPlaying}
              canPrev={currentStepIndex > 0}
              canNext={currentStepIndex < totalSteps - 1}
              onPlay={handlePlay}
              onPause={handlePause}
              onPrev={handlePrev}
              onNext={handleNext}
              onReset={handleReset}
              currentStep={currentStepIndex}
              totalSteps={totalSteps}
              speed={speed}
              onSpeedChange={setSpeed}
            />
          </div>
        </div>

        {/* Right Column: Step-by-Step Educational Guide */}
        <div className="w-full xl:w-96 flex flex-col space-y-4">
          {/* Concept Overview Card */}
          <div className="rounded-2xl border border-white/10 bg-surface-900/80 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-violet-300">
                <Brain className="w-4 h-4 text-violet-400" />
                <span>Conceptual Diagnosis</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              {visualization.mistake_summary || "Visualize the step-by-step invariant to see where the logical divergence happens."}
            </p>
            <div className="pt-1">
              <AlgoMentorVoicePlayer
                text={step.description || visualization.mistake_summary}
                compact={true}
              />
            </div>
          </div>

          {/* Current Step Focus Card */}
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className={`rounded-2xl border p-4 space-y-3 ${
              isMistakeStep
                ? "border-orange-500/40 bg-orange-500/10 shadow-[0_0_24px_rgba(249,115,22,0.15)]"
                : "border-cyan-500/30 bg-cyan-500/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isMistakeStep ? "text-orange-400" : "text-cyan-400"}`}>
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
              {isMistakeStep ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <AlertTriangle className="w-3 h-3 text-orange-400" /> Common Pitfall
                </span>
              ) : currentStepIndex === totalSteps - 1 ? (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Correct Resolution
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> Invariant Trace
                </span>
              )}
            </div>

            <h3 className="text-sm font-mono font-bold text-foreground">
              {step.operation || "Executing Step"}
            </h3>

            <p className="text-xs text-slate-200 font-sans leading-relaxed">
              {step.description}
            </p>

            {/* Pointers Inspection Box */}
            {step.pointers && Object.keys(step.pointers).length > 0 && (
              <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                {Object.entries(step.pointers).map(([name, idx]) => (
                  <div
                    key={name}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-950/80 border border-white/10 font-mono text-[11px]"
                  >
                    <span className="text-muted-foreground">{name}:</span>
                    <span className="font-bold text-cyan-300">{idx}</span>
                    <span className="text-[10px] text-muted-foreground">
                      (val={step.array[idx] !== undefined ? step.array[idx] : "-"})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Step Timeline Indicator */}
          <div className="rounded-2xl border border-white/10 bg-surface-900/60 p-4 space-y-2 flex-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Explanation Timeline
            </p>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {steps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStepIndex(idx);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                    idx === currentStepIndex
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="w-4 text-right text-[10px] opacity-70">{idx + 1}.</span>
                  <span className="truncate flex-1">{s.operation || s.description.slice(0, 30)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Back to Problem CTA */}
          <Button
            onClick={onClose}
            className="w-full rounded-xl py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-mono font-bold text-xs shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:brightness-110 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            I Understand — Back to Problem
          </Button>
        </div>
      </div>
    </div>
  );
}
