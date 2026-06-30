"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface BorderBeamProps {
  className?: string;
  /** Width of the light beam in px */
  lightWidth?: number;
  /** Color of the beam */
  lightColor?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** Border radius of the container (match parent) */
  borderWidth?: number;
}

export function BorderBeam({
  className,
  lightWidth = 300,
  lightColor = "#a855f7",
  duration = 6,
  borderWidth = 1,
}: BorderBeamProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden", className)}
      style={{ zIndex: 0 }}
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `conic-gradient(from var(--beam-angle, 0deg), transparent ${360 - (lightWidth / 10)}deg, ${lightColor} 360deg, transparent 360deg)`,
          animation: `border-beam-spin ${duration}s linear infinite`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: `${borderWidth}px`,
        }}
      />
      <style>{`
        @keyframes border-beam-spin {
          from { --beam-angle: 0deg; }
          to   { --beam-angle: 360deg; }
        }
        @property --beam-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
      `}</style>
    </div>
  );
}
