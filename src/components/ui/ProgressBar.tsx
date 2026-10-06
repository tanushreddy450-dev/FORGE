import { Progress } from "@/components/shadcn/ui/progress";
import { cn } from "@/lib/utils";

type ProgressColor = "primary" | "success" | "warning";
type ProgressSize = "sm" | "md" | "lg";

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressSize;
  color?: ProgressColor;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

const indicatorStyles: Record<ProgressColor, string> = {
  primary: "[&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-indigo-500 [&>[data-slot=progress-indicator]]:to-cyan-400 [&>[data-slot=progress-indicator]]:shadow-[0_0_12px_rgba(34,211,238,0.5)]",
  success: "[&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-teal-300 [&>[data-slot=progress-indicator]]:shadow-[0_0_12px_rgba(52,211,153,0.5)]",
  warning: "[&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-500 [&>[data-slot=progress-indicator]]:to-yellow-300 [&>[data-slot=progress-indicator]]:shadow-[0_0_12px_rgba(250,204,21,0.5)]",
};

const trackStyles: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const sizeStyles: Record<ProgressSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

/**
 * FORGE ProgressBar — 3D glowing gradient indicators with smooth Radix progress.
 */
function ProgressBar({
  value,
  max = 100,
  size = "md",
  color = "primary",
  label,
  showPercentage = false,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className={cn("font-medium text-muted-foreground", sizeStyles[size])}>{label}</span>
          )}
          {showPercentage && (
            <span className={cn("font-mono font-semibold text-foreground", sizeStyles[size])}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="relative rounded-full overflow-hidden p-0.5 bg-surface-900/60 border border-white/5 shadow-inner">
        <Progress
          value={percentage}
          aria-label={label ?? "Progress"}
          className={cn("bg-transparent rounded-full", trackStyles[size], indicatorStyles[color])}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
