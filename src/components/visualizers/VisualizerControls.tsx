import { motion } from "motion/react";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { DUR, EASE } from "@/components/motion/motion-tokens";

function ControlButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={{ duration: DUR.instant, ease: EASE }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

interface VisualizerControlsProps {
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onSpeedChange: (v: number) => void;
}

export default function VisualizerControls({
  isPlaying,
  canPrev,
  canNext,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onReset,
  currentStep,
  totalSteps,
  speed,
  onSpeedChange,
}: VisualizerControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center gap-1">
        <ControlButton
          label="Previous step"
          disabled={!canPrev}
          onClick={onPrev}
          className="p-2 rounded-lg bg-muted hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </ControlButton>
        {isPlaying ? (
          <ControlButton
            label="Pause"
            onClick={onPause}
            className="p-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          >
            <Pause className="w-4 h-4" />
          </ControlButton>
        ) : (
          <ControlButton
            label="Play"
            disabled={!canNext}
            onClick={onPlay}
            className="p-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Play className="w-4 h-4" />
          </ControlButton>
        )}
        <ControlButton
          label="Next step"
          disabled={!canNext}
          onClick={onNext}
          className="p-2 rounded-lg bg-muted hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </ControlButton>
        <ControlButton
          label="Reset"
          onClick={onReset}
          className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </ControlButton>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          {totalSteps === 0 ? "0 / 0" : `${currentStep + 1} / ${totalSteps}`}
        </span>
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all"
            style={{ width: `${totalSteps ? ((currentStep + 1) / totalSteps) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed</span>
        <input
          aria-label="Speed"
          type="range"
          min={200}
          max={1200}
          step={100}
          value={1300 - speed}
          onChange={(e) => onSpeedChange(1300 - Number(e.target.value))}
          className="w-20 accent-primary-500"
        />
      </div>
    </div>
  );
}
