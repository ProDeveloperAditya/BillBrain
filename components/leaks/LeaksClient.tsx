"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Moon,
  RefreshCcw,
  Layers,
  TrendingUp,
  Copy,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeakResult, LeakData, LeakType, LeakSeverity } from "@/lib/analytics/leakDetector";

// ─── Metadata maps ────────────────────────────────────────────────────────────

const TYPE_META: Record<LeakType, { icon: React.ElementType; label: string; accent: string }> = {
  LATE_NIGHT_FOOD:      { icon: Moon,         label: "Late-night habit",   accent: "#f97316" },
  CONVENIENCE_CLUSTER:  { icon: RefreshCcw,   label: "Habit spend",        accent: "#06b6d4" },
  SUBSCRIPTION_STACK:   { icon: Layers,       label: "Subscription stack", accent: "#8b5cf6" },
  CATEGORY_SPIKE:       { icon: TrendingUp,   label: "Category spike",     accent: "#f59e0b" },
  DUPLICATE_PAYMENT:    { icon: Copy,         label: "Duplicate charge",   accent: "#ef4444" },
  IMPULSE_ECOMMERCE:    { icon: ShoppingCart, label: "Impulse shopping",   accent: "#ec4899" },
};

const SEV_META: Record<LeakSeverity, { label: string; cls: string; dot: string }> = {
  HIGH:   { label: "High",   cls: "bg-destructive/12 text-destructive border-destructive/25",  dot: "#ef4444" },
  MEDIUM: { label: "Medium", cls: "bg-amber-400/12 text-amber-400 border-amber-400/25",        dot: "#f59e0b" },
  LOW:    { label: "Low",    cls: "bg-blue-400/12 text-blue-400 border-blue-400/25",           dot: "#3b82f6" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: LeakSeverity }) {
  const { label, cls } = SEV_META[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cls)}>
      {label}
    </span>
  );
}

function TypeLabel({ type }: { type: LeakType }) {
  const { label, accent } = TYPE_META[type];
  return (
    <span
      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{ color: accent, background: `${accent}15` }}
    >
      {label}
    </span>
  );
}

// ─── Leak card ────────────────────────────────────────────────────────────────

function LeakCard({ leak, index }: { leak: LeakResult; index: number }) {
  const { icon: Icon, accent } = TYPE_META[leak.type];
  const { dot } = SEV_META[leak.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.25 }}
    >
      <Card
        className="surface-2 border-border h-full flex flex-col hover:border-border/80 transition-colors"
        style={{ borderTopColor: dot, borderTopWidth: "2px" }}
      >
        <CardContent className="pt-4 pb-4 flex flex-col gap-3 flex-1">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}18` }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <TypeLabel type={leak.type} />
              <SeverityBadge severity={leak.severity} />
            </div>
          </div>

          {/* Title + merchant */}
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">{leak.title}</p>
            {(leak.merchant ?? leak.categoryDisplayName) && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {leak.merchant ?? leak.categoryDisplayName}
              </p>
            )}
          </div>

          {/* Annualized cost */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              Estimated annual impact
            </p>
            <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: accent }}>
              ₹{leak.annualizedCost.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              ≈ ₹{Math.round(leak.annualizedCost / 12).toLocaleString("en-IN")}/month
            </p>
          </div>

          {/* Explanation */}
          <p className="text-[12px] text-muted-foreground leading-relaxed flex-1">
            {leak.explanation}
          </p>

          {/* Evidence bullets */}
          {leak.evidence.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/50">
              {leak.evidence.map((e) => (
                <div key={e} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground">{e}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── KPI banner ───────────────────────────────────────────────────────────────

function KpiBanner({ data }: { data: LeakData }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="border-amber-400/25 bg-amber-400/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Icon */}
            <div className="h-12 w-12 rounded-2xl bg-amber-400/15 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>

            {/* Main number */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                Estimated annual waste
              </p>
              <p className="text-3xl font-bold tabular-nums text-amber-400 mt-0.5">
                ₹{data.totalAnnualWaste.toLocaleString("en-IN")}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Reducing these leaks could reclaim this amount per year
              </p>
            </div>

            {/* Severity breakdown */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {data.highCount > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-destructive">{data.highCount}</p>
                  <p className="text-[10px] text-muted-foreground">High</p>
                </div>
              )}
              {data.mediumCount > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-400">{data.mediumCount}</p>
                  <p className="text-[10px] text-muted-foreground">Medium</p>
                </div>
              )}
              {data.lowCount > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-400">{data.lowCount}</p>
                  <p className="text-[10px] text-muted-foreground">Low</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <Card className="surface-2 border-border">
        <CardContent className="py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-base font-semibold text-foreground">No leaks detected</p>
          <p className="text-[12px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
            Either your spending is well-optimised, or you need more transaction history
            (3+ months) for pattern detection.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function LeaksClient({ data }: { data: LeakData }) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Money Leak Detection
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Spending patterns that could be quietly draining your budget
          {!data.hasRealData && (
            <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Demo data
            </span>
          )}
        </p>
      </div>

      {/* KPI banner — only if leaks exist */}
      {data.leaks.length > 0 && <KpiBanner data={data} />}

      {/* Leak cards grid */}
      {data.leaks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.leaks.map((leak, i) => (
            <LeakCard key={leak.id} leak={leak} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Footer tip */}
      {data.leaks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-border/50 bg-surface-1/60 px-4 py-3"
        >
          <p className="text-[12px] text-muted-foreground">
            <span className="font-semibold text-foreground">Tip:</span> These are estimated
            projections based on your observed patterns. Actual savings depend on which habits you
            change. Start with the highest-impact items first.
          </p>
        </motion.div>
      )}
    </div>
  );
}
