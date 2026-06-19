"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, Layers, TrendingDown, TrendingUp, AlertTriangle,
  Copy, Calendar, Lightbulb, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightType =
  | "LEAK"
  | "SUBSCRIPTION_ALERT"
  | "SAVINGS_OPPORTUNITY"
  | "ANOMALY"
  | "CATEGORY_SPIKE"
  | "DUPLICATE_CHARGE"
  | "WEEKLY_DIGEST";

export type InsightSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export interface InsightRow {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  generatedAt: string;
}

export interface DigestStats {
  totalSpendThisMonth: number;
  highInsightCount: number;
  topCategory: string | null;
  topCategorySpend: number;
}

// ── Metadata maps ─────────────────────────────────────────────────────────────

const TYPE_META: Record<InsightType, { icon: React.ElementType; color: string; label: string; tab: string }> = {
  LEAK:                 { icon: Zap,          color: "#f59e0b", label: "Leak",         tab: "leaks" },
  SUBSCRIPTION_ALERT:   { icon: Layers,        color: "#a855f7", label: "Subscription", tab: "subscriptions" },
  SAVINGS_OPPORTUNITY:  { icon: TrendingDown,  color: "#10b981", label: "Savings",      tab: "savings" },
  ANOMALY:              { icon: AlertTriangle, color: "#ef4444", label: "Anomaly",      tab: "anomalies" },
  CATEGORY_SPIKE:       { icon: TrendingUp,    color: "#f97316", label: "Category Spike", tab: "anomalies" },
  DUPLICATE_CHARGE:     { icon: Copy,          color: "#ef4444", label: "Duplicate",    tab: "anomalies" },
  WEEKLY_DIGEST:        { icon: Calendar,      color: "#3b82f6", label: "Digest",       tab: "digest" },
};

const SEV_META: Record<InsightSeverity, { label: string; cls: string }> = {
  HIGH:   { label: "High",   cls: "bg-destructive/12 text-destructive border-destructive/25" },
  MEDIUM: { label: "Medium", cls: "bg-amber-400/12 text-amber-400 border-amber-400/25" },
  LOW:    { label: "Low",    cls: "bg-blue-400/12 text-blue-400 border-blue-400/25" },
  INFO:   { label: "Info",   cls: "bg-muted/50 text-muted-foreground border-border" },
};

const CAT_LABEL: Record<string, string> = {
  FOOD_DINING: "Food & Dining", GROCERIES: "Groceries", SUBSCRIPTIONS: "Subscriptions",
  TRANSPORT: "Transport", SHOPPING: "Shopping", HEALTHCARE: "Healthcare",
  OTHER: "Other",
};

const TABS = [
  { value: "all",           label: "All" },
  { value: "leaks",         label: "Leaks" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "savings",       label: "Savings" },
  { value: "anomalies",     label: "Anomalies" },
];

// ── Digest stats bar ──────────────────────────────────────────────────────────

function DigestBar({ stats }: { stats: DigestStats }) {
  const items = [
    {
      label: "Spent this month",
      value: `₹${stats.totalSpendThisMonth.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
      color: "text-foreground",
    },
    {
      label: "High priority insights",
      value: stats.highInsightCount > 0 ? String(stats.highInsightCount) : "None",
      color: stats.highInsightCount > 0 ? "text-destructive" : "text-emerald-400",
    },
    {
      label: "Top category",
      value: stats.topCategory
        ? `${CAT_LABEL[stats.topCategory] ?? stats.topCategory} · ₹${stats.topCategorySpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
        : "—",
      color: "text-foreground",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <p className="text-[12px] font-semibold text-primary uppercase tracking-wide">
              This month&apos;s digest
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
            {items.map((item) => (
              <div key={item.label} className="pt-3 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                  {item.label}
                </p>
                <p className={cn("text-[15px] font-semibold mt-0.5 tabular-nums", item.color)}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────

function InsightCard({ insight, index }: { insight: InsightRow; index: number }) {
  const meta = TYPE_META[insight.type];
  const sev = SEV_META[insight.severity];
  const Icon = meta.icon;

  const date = new Date(insight.generatedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05, duration: 0.22 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Card className="surface-2 border-border hover:border-border/80 transition-colors h-full">
        <CardContent className="pt-4 pb-4 flex gap-3">
          {/* Icon */}
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${meta.color}18` }}
          >
            <Icon className="h-5 w-5" style={{ color: meta.color }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-foreground leading-snug flex-1">
                {insight.title}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", sev.cls)}>
                  {sev.label}
                </span>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
              {insight.body}
            </p>
            <p className="text-[11px] text-muted-foreground/50 mt-2">{date}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <Card className="surface-2 border-border">
        <CardContent className="py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">No insights yet</p>
          <p className="text-[12px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
            Import at least 3 months of transaction history to start generating insights.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

export function InsightsClient({
  insights,
  digestStats,
  hasRealData,
}: {
  insights: InsightRow[];
  digestStats: DigestStats;
  hasRealData: boolean;
}) {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = activeTab === "all"
    ? insights
    : insights.filter((ins) => TYPE_META[ins.type]?.tab === activeTab);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-generated observations from your spending patterns
          {!hasRealData && (
            <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Demo data
            </span>
          )}
        </p>
      </div>

      {/* Digest */}
      <DigestBar stats={digestStats} />

      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-[12px] px-3">
              {t.label}
              {t.value !== "all" && (
                <span className="ml-1 text-[10px] opacity-60">
                  {insights.filter((i) => TYPE_META[i.type]?.tab === t.value).length || ""}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Feed */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((ins, i) => (
            <InsightCard key={ins.id} insight={ins} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
