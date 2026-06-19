"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { TrendingUp, TrendingDown, Repeat2, Zap, Target, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardKPI } from "@/lib/analytics/dashboard";

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const fmt = (v: number) =>
      prefix +
      v.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix;

    node.textContent = fmt(0);

    const controls = animate(0, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => {
        if (node) node.textContent = fmt(v);
      },
    });
    return () => controls.stop();
  }, [value, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}

// ─── Savings score ring ───────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 100) / 100;

  const color =
    score >= 80
      ? "#10b981"
      : score >= 60
      ? "#10b981"
      : score >= 40
      ? "#f59e0b"
      : "#ef4444";

  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-border"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-xs font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Score</p>
        <p className="text-sm font-semibold" style={{ color }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Individual KPI card ──────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  children: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  delta?: React.ReactNode;
  className?: string;
}

function KpiCard({ label, children, icon: Icon, iconColor, delta, className }: KpiCardProps) {
  return (
    <Card className={cn("surface-2 border-border card-hover transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tracking-tight">{children}</div>
        {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
      </CardContent>
    </Card>
  );
}

// ─── KPI cards row ────────────────────────────────────────────────────────────

export function KpiCards({ kpi }: { kpi: DashboardKPI }) {
  const momPositive = kpi.totalSpendMoM >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Total spend */}
      <KpiCard
        label="Total spend this month"
        icon={momPositive ? TrendingUp : TrendingDown}
        iconColor="#6366f1"
        delta={
          <span
            className={cn(
              "inline-flex items-center gap-1",
              momPositive ? "text-destructive" : "text-emerald-500"
            )}
          >
            {momPositive ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(kpi.totalSpendMoM)}% vs last month
          </span>
        }
      >
        <AnimatedNumber value={kpi.totalSpend} prefix="₹" />
      </KpiCard>

      {/* Avoidable spend */}
      <KpiCard
        label="Avoidable spend estimate"
        icon={Zap}
        iconColor="#f59e0b"
        delta={`${kpi.avoidablePct}% of total spend`}
      >
        <AnimatedNumber value={kpi.avoidableSpend} prefix="₹" />
      </KpiCard>

      {/* Active subscriptions */}
      <KpiCard
        label="Active subscriptions"
        icon={Repeat2}
        iconColor="#8b5cf6"
        delta={`₹${kpi.subscriptionMonthlyTotal.toLocaleString("en-IN")}/month`}
      >
        <AnimatedNumber value={kpi.activeSubscriptions} />
      </KpiCard>

      {/* Savings score */}
      <Card className="surface-2 border-border card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Savings opportunity
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-3.5 w-3.5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScoreRing score={kpi.savingsScore} />
        </CardContent>
      </Card>
    </div>
  );
}
