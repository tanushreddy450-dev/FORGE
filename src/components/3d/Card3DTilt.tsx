import React, { type ReactNode } from "react";

interface Card3DTiltProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  scale?: number;
}

/**
 * Card3DTilt — neutralized for the clean student-focused educational UI.
 * Renders static children with no wobbling, tilt, or glare effects.
 */
export default function Card3DTilt({
  children,
  className = "",
}: Card3DTiltProps) {
  return <div className={`relative ${className}`}>{children}</div>;
}
