"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// ─── Exports matching the 21st.dev API ───────────────────────────────────────

export function AnimatedCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border surface-2 flex flex-col",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardVisual({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-hidden", className)}>{children}</div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-4 shrink-0", className)}>{children}</div>;
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm font-semibold text-foreground", className)}>{children}</p>
  );
}

export function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-0.5", className)}>{children}</p>
  );
}

// ─── Visual3: animated area chart visual ────────────────────────────────────

const DEMO_DATA = [40, 55, 45, 70, 65, 80, 75, 90, 85, 95, 88, 100].map((v, i) => ({ v, i }));

export function Visual3({
  mainColor = "#6366f1",
  secondaryColor = "#8b5cf6",
}: {
  mainColor?: string;
  secondaryColor?: string;
}) {
  return (
    <div className="relative h-full min-h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DEMO_DATA} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="v3grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={mainColor}      stopOpacity={0.35} />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={mainColor}
            strokeWidth={2.5}
            fill="url(#v3grad)"
            dot={false}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
