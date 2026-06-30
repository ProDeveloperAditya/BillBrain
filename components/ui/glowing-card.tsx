"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface GlowCardProps {
  children?: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlowCard({ children, className, glowColor = "#6366f1" }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity]   = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border surface-2 transition-shadow hover:shadow-lg",
        className
      )}
    >
      {/* Mouse-follow glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(350px circle at ${position.x}px ${position.y}px, ${glowColor}22, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
}

export function Component() {
  return (
    <GlowCard className="p-6 max-w-sm">
      <h3 className="text-lg font-semibold text-foreground">Glowing Card</h3>
      <p className="text-sm text-muted-foreground mt-1">Move your cursor over this card.</p>
    </GlowCard>
  );
}
