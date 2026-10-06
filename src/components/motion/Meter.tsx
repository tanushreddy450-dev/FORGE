import { motion, useReducedMotion } from "motion/react";
import { DUR, EASE } from "./motion-tokens";
import { cn } from "@/lib/utils";

type MeterProps = {
  /** 0–100 */
  percent: number;
  className?: string;
  barClassName?: string;
  label?: string;
};

/** Progress fill that sweeps in (scaleX, GPU-cheap) when scrolled into view.
 *  Re-animates when `percent` changes. */
export function Meter({ percent, className, barClassName, label }: MeterProps) {
  const reduce = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <motion.div
        className={cn("h-full w-full origin-left rounded-full bg-primary", barClassName)}
        initial={reduce ? { scaleX: clamped / 100 } : { scaleX: 0 }}
        whileInView={{ scaleX: clamped / 100 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ duration: DUR.slow, ease: EASE }}
      />
    </div>
  );
}
