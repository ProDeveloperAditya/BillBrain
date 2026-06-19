"use client";

import { Zap, Bell, TrendingDown, AlertTriangle, Repeat2, Copy, BarChart2, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InsightItem } from "@/lib/analytics/dashboard";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  LEAK:               { icon: Zap,          color: "#f59e0b", bg: "#f59e0b18" },
  SUBSCRIPTION_ALERT: { icon: Repeat2,      color: "#8b5cf6", bg: "#8b5cf618" },
  SAVINGS_OPPORTUNITY:{ icon: TrendingDown, color: "#10b981", bg: "#10b98118" },
  ANOMALY:            { icon: AlertTriangle,color: "#ef4444", bg: "#ef444418" },
  CATEGORY_SPIKE:     { icon: BarChart2,    color: "#f97316", bg: "#f9731618" },
  DUPLICATE_CHARGE:   { icon: Copy,         color: "#ef4444", bg: "#ef444418" },
  WEEKLY_DIGEST:      { icon: Lightbulb,    color: "#06b6d4", bg: "#06b6d418" },
};

const SEVERITY_LABEL: Record<string, { label: string; color: string }> = {
  HIGH:   { label: "High",   color: "#ef4444" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  LOW:    { label: "Low",    color: "#06b6d4" },
  INFO:   { label: "Info",   color: "#94a3b8" },
};

function InsightCard({ insight }: { insight: InsightItem }) {
  const meta = TYPE_META[insight.type] ?? TYPE_META.WEEKLY_DIGEST;
  const sev  = SEVERITY_LABEL[insight.severity] ?? SEVERITY_LABEL.INFO;
  const Icon = meta.icon;

  return (
    <div className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-surface-3/50 -mx-1 px-3">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: meta.bg }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
            {insight.title}
          </p>
          <span
            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ color: sev.color, background: `${sev.color}18` }}
          >
            {sev.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {insight.body}
        </p>
      </div>
    </div>
  );
}

export function InsightCards({ insights }: { insights: InsightItem[] }) {
  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">AI Insights</CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {insights.length} active
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-1">
        {insights.map((ins) => (
          <InsightCard key={ins.id} insight={ins} />
        ))}
        {insights.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No insights yet — import data to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
