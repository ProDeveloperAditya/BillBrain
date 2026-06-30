"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  background?: string;
}

export default function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(255,255,255,0.08)",
  background = "rgba(99,102,241,0.85)",
  ...props
}: ShimmerButtonProps) {
  return (
    <>
      <style>{`
        @keyframes shimmer2 {
          0%   { background-position: 200% 0%; }
          100% { background-position: -200% 0%; }
        }
      `}</style>
      <button
        className={cn(
          "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        style={{
          background: `linear-gradient(110deg, ${background} 0%, ${shimmerColor} 40%, ${background} 60%, ${background} 100%)`,
          backgroundSize: "200% 100%",
          animation: "shimmer2 2.4s linear infinite",
        }}
        {...props}
      >
        {children}
      </button>
    </>
  );
}
