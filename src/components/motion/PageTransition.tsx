import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DUR, EASE } from "./motion-tokens";

type PageTransitionProps = {
  children: ReactNode;
};

/**
 * Subtle route transition wrapper (opacity + slight rise on enter,
 * quick fade on exit). Total budget ~350ms so navigation stays snappy.
 * Used by AnimatedRoutes in App.tsx — one instance wraps the whole
 * matched route tree per location.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DUR.fast, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
