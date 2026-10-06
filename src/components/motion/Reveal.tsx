import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { DUR, EASE } from "./motion-tokens";

type RevealProps = {
  children: ReactNode;
  /** seconds to wait before starting */
  delay?: number;
  /** vertical offset in px */
  y?: number;
  className?: string;
  /** animate on scroll into view (default) or immediately on mount */
  mode?: "inView" | "mount";
};

/**
 * Fade + rise entrance. Uses IntersectionObserver (once) in inView mode.
 * Automatically disabled when the OS requests reduced motion
 * (see MotionConfig reducedMotion="user" in main.tsx).
 */
export function Reveal({ children, delay = 0, y = 14, className, mode = "inView" }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  if (mode === "mount") {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.medium, ease: EASE, delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: DUR.medium, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
