"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface DotPatternProps {
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export function DotPattern({
  cx = 1,
  cy = 1,
  cr = 1,
  width = 16,
  height = 16,
  color = "currentColor",
  className,
}: DotPatternProps) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-neutral-400/30",
        className,
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
        >
          <circle id="dot" cx={cx} cy={cy} r={cr} fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}
