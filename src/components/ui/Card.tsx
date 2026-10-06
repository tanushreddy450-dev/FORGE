import type { HTMLAttributes, ReactNode } from "react";
import { Card as ShadcnCard } from "@/components/shadcn/ui/card";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "p-0 gap-0 py-0",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

/**
 * FORGE Card — 3D layered glass surface with bevel highlights and smooth depth shadows.
 */
function Card({ children, hover = false, padding = "md", className, ...rest }: CardProps) {
  return (
    <ShadcnCard
      className={cn(
        "gap-0 relative overflow-hidden bg-card border-border/80 backdrop-blur-xl shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_24px_-4px_rgba(2,6,23,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] rounded-2xl",
        hover &&
          "cursor-pointer transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(79,70,229,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_16px_40px_-12px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-primary/40",
        paddingStyles[padding],
        className
      )}
      {...rest}
    >
      {children}
    </ShadcnCard>
  );
}

export default Card;
