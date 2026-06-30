"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps {
  children?: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function GlowCard({ children, className, spotlightColor = "#8b5cf6" }: SpotlightCardProps) {
  const divRef  = useRef<HTMLDivElement>(null);
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [isHovering, setHover]  = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn("relative overflow-hidden rounded-2xl border border-border surface-2", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: isHovering ? 1 : 0,
          background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}18, transparent 60%)`,
        }}
      />
      {children}
    </div>
  );
}

export function Default() {
  return (
    <div className="flex gap-6 p-8">
      <GlowCard className="p-6">
        <p className="text-sm font-medium text-foreground">Spotlight Card</p>
        <p className="text-xs text-muted-foreground mt-1">Hover to see the spotlight effect.</p>
      </GlowCard>
    </div>
  );
}
