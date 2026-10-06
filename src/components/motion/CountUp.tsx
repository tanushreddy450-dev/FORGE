import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { DUR } from "./motion-tokens";

type CountUpProps = {
  value: number;
  /** decimal places */
  decimals?: number;
  duration?: number;
  className?: string;
};

/** Animated number that counts up when scrolled into view. Renders the
 *  final value immediately for reduced-motion users and SSR. */
export function CountUp({ value, decimals = 0, duration = DUR.slow, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!inView || reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
    </span>
  );
}
