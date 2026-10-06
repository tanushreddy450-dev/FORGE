import { motion, useReducedMotion } from "motion/react";

type TypingDotsProps = {
  label?: string;
  className?: string;
};

/** Subtle three-dot typing indicator (opacity pulse only — no bounce). */
export function TypingDots({ label = "Thinking", className = "" }: TypingDotsProps) {
  const reduce = useReducedMotion();

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-40"
          animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
          transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
      <span className="sr-only">{label}…</span>
    </span>
  );
}
