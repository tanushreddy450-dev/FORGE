import { Badge as ShadcnBadge } from "@/components/shadcn/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantMap = {
  default: "secondary",
  primary: "default",
  success: "outline",
  warning: "outline",
  danger: "outline",
} as const;

const toneStyles: Partial<Record<BadgeVariant, string>> = {
  primary: "border-primary/40 bg-primary/15 text-primary-300 font-mono shadow-[0_0_10px_rgba(99,102,241,0.2)]",
  success: "border-success-500/40 bg-success-500/15 text-success-300 font-mono shadow-[0_0_10px_rgba(34,197,94,0.2)]",
  warning: "border-warning-500/40 bg-warning-500/15 text-warning-300 font-mono shadow-[0_0_10px_rgba(234,179,8,0.2)]",
  danger: "border-danger-500/40 bg-danger-500/15 text-danger-300 font-mono shadow-[0_0_10px_rgba(239,68,68,0.2)]",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
  md: "rounded-full px-3 py-1 text-xs font-semibold",
};

/**
 * FORGE Badge — 3D status badge with code typography and glowing borders.
 */
function Badge({ variant = "default", size = "sm", children, className = "" }: BadgeProps) {
  return (
    <ShadcnBadge
      variant={variantMap[variant]}
      className={cn(sizeStyles[size], toneStyles[variant], "backdrop-blur-md transition-all", className)}
    >
      {children}
    </ShadcnBadge>
  );
}

export default Badge;
