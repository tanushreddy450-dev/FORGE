import { forwardRef } from "react";
import { Button as ShadcnButton } from "@/components/shadcn/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantMap = {
  primary: "default",
  secondary: "secondary",
  ghost: "ghost",
  danger: "destructive",
} as const;

const sizeMap = {
  sm: "sm",
  md: "default",
  lg: "lg",
} as const;

const brandExtras: Record<ButtonVariant, string> = {
  primary:
    "rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white font-medium shadow-[0_4px_20px_-4px_rgba(99,102,241,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_8px_28px_-4px_rgba(99,102,241,0.7),inset_0_1px_0_rgba(255,255,255,0.3)] hover:-translate-y-0.5 active:translate-y-px transition-all duration-200 border border-indigo-400/30",
  secondary:
    "rounded-xl bg-surface-800/80 hover:bg-surface-700/90 text-foreground font-medium border border-white/10 hover:border-primary/40 shadow-[0_2px_10px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-0.5 active:translate-y-px transition-all duration-200",
  ghost:
    "rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.07] transition-all duration-150",
  danger:
    "rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium shadow-[0_4px_16px_-4px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 active:translate-y-px transition-all duration-200 border border-red-500/30",
};

/**
 * FORGE Button — 3D tactile press, glowing gradients, hover elevation.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", icon, children, className, disabled, ...rest }, ref) => {
    return (
      <ShadcnButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        disabled={disabled}
        className={cn(brandExtras[variant], className)}
        {...rest}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </ShadcnButton>
    );
  }
);

Button.displayName = "Button";

export default Button;
