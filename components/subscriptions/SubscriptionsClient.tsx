"use client";

import { motion } from "framer-motion";
import {
  Repeat2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Copy,
  CalendarClock,
  IndianRupee,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DetectedSubscription, DuplicateRiskGroup, SubscriptionData } from "@/lib/analytics/recurringDetector";

// ─── Sub-components ───────────────────────────────────────────────────────────

function MerchantAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="h-9 w-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 select-none"
      style={{ background: `${color}20`, color }}
    >
      {initials}
    </div>
  );
}

function CadenceBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
      {label}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const { label, cls } =
    score >= 80 ? { label: "High confidence", cls: "bg-emerald-400/12 text-emerald-400" }
    : score >= 60 ? { label: "Likely",         cls: "bg-blue-400/12 text-blue-400" }
    : score >= 40 ? { label: "Possible",        cls: "bg-amber-400/12 text-amber-400" }
    : { label: "Low",                           cls: "bg-surface-3 text-muted-foreground" };
  return (
    <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", cls)}>
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ─── Subscription row ─────────────────────────────────────────────────────────

function SubRow({
  sub,
  index,
  showMonthlyCost = false,
}: {
  sub: DetectedSubscription;
  index: number;
  showMonthlyCost?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-3/40 transition-colors group"
    >
      <MerchantAvatar name={sub.merchantName} color={sub.categoryColor} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-foreground truncate">{sub.merchantName}</p>
          <CadenceBadge label={sub.cadenceLabel} />
          <ConfidenceBadge score={sub.confidence} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {sub.monthsActive} months · last {fmtDate(sub.lastChargedDate)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[14px] font-bold tabular-nums">
          {showMonthlyCost ? fmtRupee(Math.round(sub.monthlyCost)) : fmtRupee(sub.latestAmount)}
          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
            {showMonthlyCost ? "/mo" : ""}
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground">{fmtRupee(sub.annualCost)}/yr</p>
      </div>
    </motion.div>
  );
}

// ─── KPI stats bar ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
    >
      <Card className="surface-2 border-border">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{value}</p>
              {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ActiveSection({ subscriptions }: { subscriptions: DetectedSubscription[] }) {
  if (subscriptions.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className="surface-2 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-primary" />
              Active Subscriptions
            </CardTitle>
            <span className="text-[10px] text-muted-foreground">{subscriptions.length} detected</span>
          </div>
        </CardHeader>
        <CardContent className="pt-1 space-y-0.5">
          {subscriptions.map((sub, i) => (
            <SubRow key={sub.id} sub={sub} index={i} showMonthlyCost />
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PriceIncreaseSection({ items }: { items: DetectedSubscription[] }) {
  if (items.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <Card className="surface-2 border-border border-amber-400/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Price Increase Alerts
            <span className="text-[10px] font-normal text-muted-foreground">
              {items.length} subscription{items.length > 1 ? "s" : ""} now cost more
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1 space-y-2">
          {items.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-amber-400/6 border border-amber-400/20"
            >
              <MerchantAvatar name={sub.merchantName} color="#f59e0b" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{sub.merchantName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground line-through">
                    {sub.previousAmount !== undefined ? fmtRupee(Math.round(sub.previousAmount)) : "—"}
                  </span>
                  <span className="text-[10px] text-amber-400">→</span>
                  <span className="text-[12px] font-semibold text-amber-400">
                    {fmtRupee(sub.latestAmount)}
                  </span>
                  {sub.priceIncreasePct !== undefined && (
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded-full bg-amber-400/15 text-amber-400">
                      +{sub.priceIncreasePct}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted-foreground">Extra/year</p>
                <p className="text-[13px] font-bold text-amber-400">
                  +{fmtRupee(
                    Math.round(
                      ((sub.latestAmount - (sub.previousAmount ?? sub.latestAmount)) *
                        (sub.cadence === "MONTHLY" ? 12
                        : sub.cadence === "YEARLY" ? 1
                        : sub.cadence === "QUARTERLY" ? 4 : 12))
                    )
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DormantSection({ items }: { items: DetectedSubscription[] }) {
  if (items.length === 0) return null;
  const potentialSaving = items.reduce((s, r) => s + r.annualCost, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
      <Card className="surface-2 border-border border-red-400/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-destructive" />
              Possibly Forgotten
            </CardTitle>
            <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-2.5 py-1">
              <p className="text-[10px] font-semibold text-destructive">
                Cancel to save {fmtRupee(Math.round(potentialSaving))}/year
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-1 space-y-2">
          {items.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.42 + i * 0.07 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-destructive/4 border border-destructive/15"
            >
              <MerchantAvatar name={sub.merchantName} color="#ef4444" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{sub.merchantName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
                  Last charged {fmtDate(sub.lastChargedDate)} · {sub.daysSinceLastCharge} days ago
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-foreground">{fmtRupee(sub.latestAmount)}/mo</p>
                <p className="text-[10px] text-destructive">{fmtRupee(sub.annualCost)}/year wasted</p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DuplicateRiskSection({ groups }: { groups: DuplicateRiskGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.49 }}>
      <Card className="surface-2 border-border border-violet-400/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Copy className="h-4 w-4 text-violet-400" />
            Duplicate Subscription Risk
            <span className="text-[10px] font-normal text-muted-foreground">
              Multiple services in the same category
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1 space-y-4">
          {groups.map((group, gi) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.49 + gi * 0.08 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: group.categoryColor }}
                />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.categoryDisplayName}
                </p>
              </div>
              <div className="space-y-1.5">
                {group.subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 bg-violet-400/5 border border-violet-400/15"
                  >
                    <MerchantAvatar name={sub.merchantName} color={sub.categoryColor} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{sub.merchantName}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.cadenceLabel}</p>
                    </div>
                    <p className="text-[13px] font-semibold tabular-nums">{fmtRupee(sub.annualCost)}/yr</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-violet-400 mt-2 pl-1">
                Consider cancelling the cheaper one — saves {fmtRupee(Math.round(group.potentialSaving))}/year
              </p>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SubscriptionsClient({ data }: { data: SubscriptionData }) {
  const annualStr   = fmtRupee(data.totalAnnualCost);
  const monthlyStr  = fmtRupee(Math.round(data.totalMonthlyCost));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Subscription Hunter
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recurring charges detected from your transaction history
            {!data.hasRealData && (
              <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Demo data
              </span>
            )}
          </p>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Estimated annual spend"
          value={annualStr}
          sub={`${monthlyStr}/mo`}
          icon={IndianRupee}
          color="#8b5cf6"
          delay={0}
        />
        <StatCard
          label="Active subscriptions"
          value={String(data.activeCount)}
          icon={Repeat2}
          color="#10b981"
          delay={0.06}
        />
        <StatCard
          label="Price increases"
          value={String(data.priceIncreaseCount)}
          sub={data.priceIncreaseCount > 0 ? "Review billing" : "All stable"}
          icon={TrendingUp}
          color={data.priceIncreaseCount > 0 ? "#f59e0b" : "#64748b"}
          delay={0.12}
        />
        <StatCard
          label="Possibly dormant"
          value={String(data.dormantCount)}
          sub={
            data.dormantCount > 0
              ? `Save ${fmtRupee(data.dormant.reduce((s, r) => s + r.annualCost, 0))}/yr`
              : "None found"
          }
          icon={Clock}
          color={data.dormantCount > 0 ? "#ef4444" : "#64748b"}
          delay={0.18}
        />
      </div>

      {/* No subscriptions detected */}
      {data.activeCount === 0 && data.dormantCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="surface-2 border-border">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-surface-3 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No recurring charges detected yet</p>
              <p className="text-[12px] text-muted-foreground mt-1.5 max-w-xs mx-auto">
                Import at least 3 months of bank statements to let BillBrain detect your subscriptions.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main sections */}
      <ActiveSection subscriptions={data.active} />

      {/* Alerts row: price increases + dormant side by side on larger screens */}
      {(data.priceIncreases.length > 0 || data.dormant.length > 0) && (
        <div className={cn(
          "grid gap-4",
          data.priceIncreases.length > 0 && data.dormant.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}>
          <PriceIncreaseSection items={data.priceIncreases} />
          <DormantSection       items={data.dormant} />
        </div>
      )}

      <DuplicateRiskSection groups={data.duplicateRisks} />

      {/* Footer insight */}
      {data.activeCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          <div className="rounded-xl border border-border/50 bg-surface-1/60 px-4 py-3 flex items-start gap-3">
            <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[12px] text-muted-foreground">
              Your {data.activeCount} active subscription{data.activeCount > 1 ? "s" : ""} cost{" "}
              <span className="text-foreground font-semibold">{annualStr}</span> per year.{" "}
              {data.duplicateRiskCount > 0 &&
                `Eliminating overlapping services could save up to ${fmtRupee(
                  data.duplicateRisks.reduce((s, g) => s + g.potentialSaving, 0)
                )}/year.`}
              {data.dormantCount > 0 &&
                ` Cancelling forgotten subscriptions could free up ${fmtRupee(
                  data.dormant.reduce((s, r) => s + r.annualCost, 0)
                )}/year.`}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
