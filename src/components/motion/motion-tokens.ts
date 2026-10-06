import type { Variants } from "motion/react";

/** Premium, fast, subtle. Transform + opacity only. No bounce. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DUR = {
  instant: 0.18,
  fast: 0.3,
  medium: 0.45,
  slow: 0.6,
} as const;

/** Fade + slight rise. Used for section entrances and cards. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.medium, ease: EASE, delay },
  }),
};

/** Container that staggers direct <StaggerItem/> children. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Child of <StaggerGroup/>. */
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.fast, ease: EASE },
  },
};

/** Keyed content swap (explanations, output, step text). */
export const stepFade: Variants = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DUR.instant, ease: EASE } },
};

/** Gentle press feedback for buttons and controls. */
export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { duration: DUR.instant, ease: EASE },
} as const;

/** Snappy but smooth spring for visualizer bars (position + size). */
export const barSpring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};
