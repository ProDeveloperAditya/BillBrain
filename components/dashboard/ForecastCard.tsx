"use client";

import { TrendingUp, TrendingDown, Minus, Brain, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ForecastResult } from "@/lib/analytics/spendingForecast";

function fmt(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const TREND_CONFIG = {
  RISING:  { icon: TrendingUp,   color: "text-red-400",     bg: "bg-red-500/10",      label: "Spending up" },
  FALLING: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-500/10",  label: "Spending down" },
  STABLE:  { icon: Minus,        color: "text-blue-400",    bg: "bg-blue-500/10",     label: "Stable" },
};

const CONFIDENCE_CONFIG = {
  HIGH:   { label: "High confidence",   color: "text-emerald-400", dot: "bg-emerald-400" },
  MEDIUM: { label: "Medium confidence", color: "text-amber-400",   dot: "bg-amber-400"   },
  LOW:    { label: "Low confidence",    color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export function ForecastCard({ forecast }: { forecast: ForecastResult }) {
  const trend  = TREND_CONFIG[forecast.trend];
  const conf   = CONFIDENCE_CONFIG[forecast.confidence];
  const TIcon  = trend.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="surface-2 border border-border rounded-2xl p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Next month forecast
          </p>
        </div>

        {/* Confidence badge */}
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", conf.dot)} />
          <span className={cn("text-[11px] font-medium", conf.color)}>{conf.label}</span>
        </div>
      </div>

      {/* Main prediction */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {fmt(forecast.predictedSpend)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Range: {fmt(forecast.lowerBound)} – {fmt(forecast.upperBound)}
          </p>
        </div>

        {/* Trend pill */}
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0", trend.bg)}>
          <TIcon className={cn("h-3.5 w-3.5", trend.color)} />
          <span className={cn("text-[12px] font-semibold", trend.color)}>
            {forecast.trendPercent > 0 ? "+" : ""}{forecast.trendPercent}%
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Prediction range</span>
          <span>
            {fmt(forecast.lowerBound)} → {fmt(forecast.upperBound)}
          </span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-border overflow-hidden">
          {/* Band showing the confidence interval */}
          <div
            className="absolute top-0 h-full rounded-full bg-primary/25"
            style={{
              left: `${Math.max(0, ((forecast.lowerBound / forecast.upperBound) * 100) - 10)}%`,
              right: "0%",
            }}
          />
          {/* Point estimate */}
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-primary"
            style={{
              left: `${Math.min(90, ((forecast.predictedSpend / forecast.upperBound) * 100))}%`,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Based on weighted regression over your last{" "}
          {forecast.confidence === "HIGH" ? "6" : forecast.confidence === "MEDIUM" ? "4–5" : "3"}{" "}
          months of spending data.
        </p>
      </div>
    </motion.div>
  );
}

export function ForecastCardPlaceholder({ monthsHave }: { monthsHave: number }) {
  const monthsNeed = 3 - monthsHave;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="surface-2 border border-border rounded-2xl p-5 flex items-center gap-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 border border-primary/15">
        <Lock className="h-4.5 w-4.5 text-primary/50" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-primary/60" />
          <p className="text-sm font-semibold text-foreground">Next Month Forecast</p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
            WLS Model
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">
          Import{" "}
          <span className="font-semibold text-foreground">
            {monthsNeed} more month{monthsNeed > 1 ? "s" : ""}
          </span>{" "}
          of statements to unlock spend predictions with 80% confidence bands.
        </p>
      </div>
      {/* Mini progress dots */}
      <div className="shrink-0 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-2 rounded-full",
              i < monthsHave ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}
