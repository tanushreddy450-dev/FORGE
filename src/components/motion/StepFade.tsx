import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { stepFade } from "./motion-tokens";

type StepFadeProps = {
  /** change this to transition content */
  stepKey: string | number;
  children: ReactNode;
  className?: string;
};

/** Keyed crossfade for step explanations, output panels, hint text. */
export function StepFade({ stepKey, children, className }: StepFadeProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        className={className}
        variants={stepFade}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
