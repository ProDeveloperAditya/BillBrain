/**
 * Money-leak detector — server-side only.
 * Analyses a user's transaction history for six avoidable-spend patterns.
 */

import { db } from "@/lib/db";
import { CATEGORY_META } from "./dashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeakType =
  | "LATE_NIGHT_FOOD"
  | "CONVENIENCE_CLUSTER"
  | "SUBSCRIPTION_STACK"
  | "CATEGORY_SPIKE"
  | "DUPLICATE_PAYMENT"
  | "IMPULSE_ECOMMERCE";

export type LeakSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface LeakResult {
  id: string;
  type: LeakType;
  severity: LeakSeverity;
  title: string;
  merchant?: string;
  category?: string;
  categoryDisplayName?: string;
  categoryColor?: string;
  amount: number;           // observed monthly / per-event amount
  annualizedCost: number;   // extrapolated 12-month impact
  explanation: string;
  evidence: string[];       // 2–4 supporting bullet points
}

export interface LeakData {
  leaks: LeakResult[];
  totalAnnualWaste: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  hasRealData: boolean;
}

// ─── Internal row type ─────────────────────────────────────────────────────────

interface TxRow {
  id: string;
  date: Date;
  amount: number;
  category: string;
  normalizedMerchant: string | null;
  description: string | null;
  tags: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function key(tx: TxRow): string {
  return (tx.normalizedMerchant ?? tx.description ?? "unknown").toLowerCase().trim();
}

function isoMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Span in months between first and last transaction dates (minimum 1). */
function monthSpan(txs: TxRow[]): number {
  if (txs.length === 0) return 1;
  const first = txs[0].date.getTime();
  const last  = txs[txs.length - 1].date.getTime();
  return Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24 * 30.44)));
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

const FOOD_CATS = new Set(["FOOD_DINING", "COFFEE_CAFES", "GROCERIES"]);
const ECOMMERCE_KEYS = new Set(["amazon", "flipkart", "meesho", "myntra", "ajio", "nykaa"]);
const SKIP_SPIKE_CATS = new Set([
  "SALARY_INCOME", "RENT_HOUSING", "UTILITIES", "INVESTMENTS", "TRANSFERS",
  "BANKING_FEES", "INSURANCE",
]);

// ─── Pattern 1: Late-night food delivery ──────────────────────────────────────

function detectLateNightFood(txs: TxRow[]): LeakResult | null {
  const lateNight = txs.filter((tx) => {
    if (!FOOD_CATS.has(tx.category)) return false;
    if (tx.tags.includes("late-night")) return true;
    const h = tx.date.getUTCHours();
    return h >= 23 || h < 3;
  });

  if (lateNight.length < 3) return null;

  const span    = monthSpan(txs);
  const monthly = lateNight.reduce((s, t) => s + t.amount, 0) / span;
  const avgAmt  = avg(lateNight.map((t) => t.amount));

  const merchants = [...new Set(lateNight.map(key))];
  const topMerchant = merchants[0] ?? "Food delivery";

  return {
    id: "late-night-food",
    type: "LATE_NIGHT_FOOD",
    severity: "HIGH",
    title: "Late-night food delivery habit",
    merchant: topMerchant.replace(/\b\w/g, (c) => c.toUpperCase()),
    category: "FOOD_DINING",
    categoryDisplayName: "Food & Dining",
    categoryColor: "#f97316",
    amount: Math.round(monthly),
    annualizedCost: Math.round(monthly * 12),
    explanation: `You placed ${lateNight.length} food orders between 11 pm–3 am over ${span} month${span > 1 ? "s" : ""}. Late-night delivery typically costs 20–30% more due to surge pricing.`,
    evidence: [
      `${lateNight.length} late-night orders across ${span} month${span > 1 ? "s" : ""}`,
      `Average order value ₹${Math.round(avgAmt).toLocaleString("en-IN")}`,
      `Most frequent: ${topMerchant.replace(/\b\w/g, (c) => c.toUpperCase())}`,
      `Estimated monthly impact ₹${Math.round(monthly).toLocaleString("en-IN")}`,
    ],
  };
}

// ─── Pattern 2: Convenience clustering ───────────────────────────────────────

function detectConvenienceClusters(txs: TxRow[]): LeakResult[] {
  const byMerchant = new Map<string, TxRow[]>();
  for (const tx of txs) {
    const k = key(tx);
    if (!byMerchant.has(k)) byMerchant.set(k, []);
    byMerchant.get(k)!.push(tx);
  }

  const results: LeakResult[] = [];

  for (const [merchant, merchantTxs] of byMerchant) {
    const sorted = [...merchantTxs].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Sliding 7-day window
    let maxWeekCount = 0;
    let maxWeekAmount = 0;

    for (let i = 0; i < sorted.length; i++) {
      const windowEnd = sorted[i].date.getTime() + 7 * 86_400_000;
      const inWindow = sorted.filter(
        (t) => t.date.getTime() >= sorted[i].date.getTime() && t.date.getTime() < windowEnd
      );
      if (inWindow.length > maxWeekCount) {
        maxWeekCount  = inWindow.length;
        maxWeekAmount = inWindow.reduce((s, t) => s + t.amount, 0);
      }
    }

    if (maxWeekCount < 4) continue;

    const span           = monthSpan(txs);
    const weeklyEstimate = maxWeekAmount;
    const annualized     = Math.round(weeklyEstimate * 52);
    const displayName    = merchant.replace(/\b\w/g, (c) => c.toUpperCase());

    results.push({
      id: `cluster-${merchant}`,
      type: "CONVENIENCE_CLUSTER",
      severity: maxWeekCount >= 7 ? "HIGH" : "MEDIUM",
      title: `Habit spending at ${displayName}`,
      merchant: displayName,
      category: merchantTxs[0].category,
      categoryDisplayName: CATEGORY_META[merchantTxs[0].category]?.displayName ?? merchantTxs[0].category,
      categoryColor: CATEGORY_META[merchantTxs[0].category]?.color ?? "#94a3b8",
      amount: Math.round(weeklyEstimate),
      annualizedCost: annualized,
      explanation: `You visited ${displayName} ${maxWeekCount} times in a single week. Habit-based convenience spending is hard to notice but adds up significantly over time.`,
      evidence: [
        `${maxWeekCount} transactions in one 7-day window`,
        `₹${Math.round(weeklyEstimate).toLocaleString("en-IN")} spent that week`,
        `${merchantTxs.length} total transactions over ${span} month${span > 1 ? "s" : ""}`,
        `Est. ₹${annualized.toLocaleString("en-IN")}/year at this rate`,
      ],
    });
  }

  // Return top 2 cluster offenders by annualized cost
  return results.sort((a, b) => b.annualizedCost - a.annualizedCost).slice(0, 2);
}

// ─── Pattern 3: Subscription stack ────────────────────────────────────────────

function detectSubscriptionStack(txs: TxRow[]): LeakResult | null {
  const subTxs = txs.filter(
    (t) => t.category === "SUBSCRIPTIONS" || t.category === "ENTERTAINMENT"
  );

  if (subTxs.length === 0) return null;

  // Group by merchant, keep those appearing in 2+ months with amount ≤ ₹200
  const byMerchant = new Map<string, TxRow[]>();
  for (const tx of subTxs) {
    const k = key(tx);
    if (!byMerchant.has(k)) byMerchant.set(k, []);
    byMerchant.get(k)!.push(tx);
  }

  const small: Array<{ name: string; amount: number }> = [];
  for (const [merchant, group] of byMerchant) {
    const months   = new Set(group.map((t) => isoMonth(t.date)));
    const avgAmt   = avg(group.map((t) => t.amount));
    if (months.size >= 2 && avgAmt <= 200) {
      small.push({ name: merchant.replace(/\b\w/g, (c) => c.toUpperCase()), amount: avgAmt });
    }
  }

  if (small.length < 5) return null;

  const monthlyTotal = small.reduce((s, r) => s + r.amount, 0);
  const names        = small.map((s) => s.name).slice(0, 4).join(", ");

  return {
    id: "subscription-stack",
    type: "SUBSCRIPTION_STACK",
    severity: "MEDIUM",
    title: "Micro-subscription stack",
    category: "SUBSCRIPTIONS",
    categoryDisplayName: "Subscriptions",
    categoryColor: "#8b5cf6",
    amount: Math.round(monthlyTotal),
    annualizedCost: Math.round(monthlyTotal * 12),
    explanation: `You have ${small.length} active subscriptions each under ₹200/month. Individually they seem trivial, but together they drain ₹${Math.round(monthlyTotal).toLocaleString("en-IN")}/month.`,
    evidence: [
      `${small.length} subscriptions ≤ ₹200/month`,
      `Combined monthly cost ₹${Math.round(monthlyTotal).toLocaleString("en-IN")}`,
      `Includes: ${names}`,
      `Could cancel 2–3 overlapping services`,
    ],
  };
}

// ─── Pattern 4: Category spike ────────────────────────────────────────────────

function detectCategorySpikes(txs: TxRow[]): LeakResult[] {
  // Build monthly spend per category
  const monthCat = new Map<string, Map<string, number>>();
  for (const tx of txs) {
    if (SKIP_SPIKE_CATS.has(tx.category)) continue;
    const m = isoMonth(tx.date);
    if (!monthCat.has(m)) monthCat.set(m, new Map());
    const cm = monthCat.get(m)!;
    cm.set(tx.category, (cm.get(tx.category) ?? 0) + tx.amount);
  }

  const months = [...monthCat.keys()].sort();
  if (months.length < 3) return [];

  const latest   = months[months.length - 1];
  const baseline = months.slice(-4, -1); // up to 3 prior months

  const spikes: LeakResult[] = [];

  for (const [cat, latestSpend] of monthCat.get(latest)!) {
    const priorSpends = baseline
      .map((m) => monthCat.get(m)?.get(cat) ?? 0)
      .filter((v) => v > 0);
    if (priorSpends.length < 2) continue;

    const baselineAvg = avg(priorSpends);
    if (baselineAvg < 500) continue; // ignore trivially small categories
    const delta = (latestSpend - baselineAvg) / baselineAvg;
    if (delta < 0.4) continue;

    const meta     = CATEGORY_META[cat] ?? { displayName: cat, color: "#94a3b8" };
    const spikePct = Math.round(delta * 100);
    const extra    = Math.round(latestSpend - baselineAvg);

    spikes.push({
      id: `spike-${cat}`,
      type: "CATEGORY_SPIKE",
      severity: delta >= 1.0 ? "HIGH" : delta >= 0.6 ? "MEDIUM" : "LOW",
      title: `${meta.displayName} spending spike`,
      category: cat,
      categoryDisplayName: meta.displayName,
      categoryColor: meta.color,
      amount: extra,
      annualizedCost: Math.round(extra * 12),
      explanation: `Your ${meta.displayName.toLowerCase()} spending jumped ${spikePct}% above your 3-month average in the latest period (₹${Math.round(latestSpend).toLocaleString("en-IN")} vs avg ₹${Math.round(baselineAvg).toLocaleString("en-IN")}).`,
      evidence: [
        `Latest month: ₹${Math.round(latestSpend).toLocaleString("en-IN")}`,
        `3-month baseline: ₹${Math.round(baselineAvg).toLocaleString("en-IN")}`,
        `${spikePct}% above normal`,
        `Extra spend: ₹${extra.toLocaleString("en-IN")} this month`,
      ],
    });
  }

  return spikes.sort((a, b) => b.annualizedCost - a.annualizedCost).slice(0, 3);
}

// ─── Pattern 5: Duplicate payment ─────────────────────────────────────────────

function detectDuplicates(txs: TxRow[]): LeakResult | null {
  const dupes: Array<{ merchant: string; amount: number; dates: string[] }> = [];

  const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const gap = (sorted[j].date.getTime() - sorted[i].date.getTime()) / 86_400_000;
      if (gap > 3) break;
      if (
        Math.abs(sorted[i].amount - sorted[j].amount) < 0.01 &&
        key(sorted[i]) === key(sorted[j])
      ) {
        dupes.push({
          merchant: key(sorted[i]).replace(/\b\w/g, (c) => c.toUpperCase()),
          amount:   sorted[i].amount,
          dates:    [isoDay(sorted[i].date), isoDay(sorted[j].date)],
        });
      }
    }
  }

  if (dupes.length === 0) return null;

  const totalDuped = dupes.reduce((s, d) => s + d.amount, 0);
  const span       = monthSpan(txs);
  const topMerchant = dupes[0].merchant;

  return {
    id: "duplicate-payment",
    type: "DUPLICATE_PAYMENT",
    severity: "HIGH",
    title: "Possible duplicate charges detected",
    merchant: topMerchant,
    amount: Math.round(totalDuped),
    annualizedCost: Math.round((totalDuped / span) * 12),
    explanation: `Found ${dupes.length} instance${dupes.length > 1 ? "s" : ""} where the same amount was charged by the same merchant within 3 days. These may be accidental double-billings.`,
    evidence: [
      `${dupes.length} duplicate pair${dupes.length > 1 ? "s" : ""} detected`,
      `Total duplicated amount: ₹${Math.round(totalDuped).toLocaleString("en-IN")}`,
      `Example: ${topMerchant} — ₹${dupes[0].amount.toLocaleString("en-IN")} on ${dupes[0].dates[0]} and ${dupes[0].dates[1]}`,
      "Contact your bank to request a refund",
    ],
  };
}

// ─── Pattern 6: Impulse e-commerce ────────────────────────────────────────────

function detectImpulseEcommerce(txs: TxRow[]): LeakResult | null {
  const ecom = txs.filter((t) => {
    const k = key(t);
    return ECOMMERCE_KEYS.has(k) || t.category === "SHOPPING";
  });

  if (ecom.length === 0) return null;

  // Group by day
  const byDay = new Map<string, TxRow[]>();
  for (const tx of ecom) {
    const d = isoDay(tx.date);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(tx);
  }

  const impulseDays = [...byDay.values()].filter((group) => group.length >= 3);
  if (impulseDays.length === 0) return null;

  const span          = monthSpan(txs);
  const totalImpulse  = impulseDays.reduce((s, g) => s + g.reduce((ss, t) => ss + t.amount, 0), 0);
  const monthlyImpulse = totalImpulse / span;
  const merchants     = [...new Set(ecom.map(key))].map((m) => m.replace(/\b\w/g, (c) => c.toUpperCase()));

  return {
    id: "impulse-ecommerce",
    type: "IMPULSE_ECOMMERCE",
    severity: impulseDays.length >= 3 ? "HIGH" : "MEDIUM",
    title: "Impulse online shopping sessions",
    merchant: merchants.slice(0, 2).join(" / "),
    category: "SHOPPING",
    categoryDisplayName: "Shopping",
    categoryColor: "#f59e0b",
    amount: Math.round(monthlyImpulse),
    annualizedCost: Math.round(monthlyImpulse * 12),
    explanation: `Found ${impulseDays.length} day${impulseDays.length > 1 ? "s" : ""} with 3 or more e-commerce transactions in a single session — a classic impulse buying pattern.`,
    evidence: [
      `${impulseDays.length} impulse shopping session${impulseDays.length > 1 ? "s" : ""} detected`,
      `Total spent: ₹${Math.round(totalImpulse).toLocaleString("en-IN")} across all sessions`,
      `Platforms: ${merchants.slice(0, 3).join(", ")}`,
      `Monthly impact: ₹${Math.round(monthlyImpulse).toLocaleString("en-IN")}`,
    ],
  };
}

// ─── Core detector ────────────────────────────────────────────────────────────

export function detectLeaks(transactions: TxRow[]): LeakResult[] {
  const debits = transactions
    .filter((t) => t.amount > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const results: LeakResult[] = [
    detectLateNightFood(debits),
    ...detectConvenienceClusters(debits),
    detectSubscriptionStack(debits),
    ...detectCategorySpikes(debits),
    detectDuplicates(debits),
    detectImpulseEcommerce(debits),
  ].filter((r): r is LeakResult => r !== null);

  return results.sort((a, b) => b.annualizedCost - a.annualizedCost);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getLeakData(userId: string): Promise<LeakData> {
  const raw = await db.transaction.findMany({
    where: { userId, type: "DEBIT", isDuplicate: false, amount: { gt: 0 } },
    select: {
      id: true, date: true, amount: true, category: true,
      normalizedMerchant: true, description: true, tags: true,
    },
    orderBy: { date: "asc" },
  });

  if (raw.length === 0) return buildDemoLeaks();

  const txs: TxRow[] = raw.map((t) => ({
    id:                 t.id,
    date:               t.date,
    amount:             Number(t.amount),
    category:           t.category,
    normalizedMerchant: t.normalizedMerchant,
    description:        t.description,
    tags:               t.tags,
  }));

  const leaks = detectLeaks(txs);

  return {
    leaks,
    totalAnnualWaste: leaks.reduce((s, l) => s + l.annualizedCost, 0),
    highCount:   leaks.filter((l) => l.severity === "HIGH").length,
    mediumCount: leaks.filter((l) => l.severity === "MEDIUM").length,
    lowCount:    leaks.filter((l) => l.severity === "LOW").length,
    hasRealData: true,
  };
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

function buildDemoLeaks(): LeakData {
  const leaks: LeakResult[] = [
    {
      id: "late-night-food",
      type: "LATE_NIGHT_FOOD",
      severity: "HIGH",
      title: "Late-night food delivery habit",
      merchant: "Zomato",
      category: "FOOD_DINING",
      categoryDisplayName: "Food & Dining",
      categoryColor: "#f97316",
      amount: 2300,
      annualizedCost: 27600,
      explanation: "You ordered food delivery 6 times between 11 pm–3 am this month. Late-night orders average ₹383 each and include surge charges.",
      evidence: ["6 late-night orders in the last 30 days","Avg order ₹383","Mostly Zomato after midnight","Surge pricing adds ~25% to each order"],
    },
    {
      id: "subscription-stack",
      type: "SUBSCRIPTION_STACK",
      severity: "MEDIUM",
      title: "Micro-subscription stack",
      category: "SUBSCRIPTIONS",
      categoryDisplayName: "Subscriptions",
      categoryColor: "#8b5cf6",
      amount: 1217,
      annualizedCost: 14604,
      explanation: "You have 5 active subscriptions each under ₹200/month. Together they cost ₹1,217/month — easy to overlook individually.",
      evidence: ["5 subscriptions ≤ ₹200/month","Spotify ₹119, Prime ₹299, Hotstar ₹299, …","Combined ₹1,217/month","Could consolidate 2–3 overlapping services"],
    },
    {
      id: "spike-SHOPPING",
      type: "CATEGORY_SPIKE",
      severity: "MEDIUM",
      title: "Shopping spending spike",
      category: "SHOPPING",
      categoryDisplayName: "Shopping",
      categoryColor: "#f59e0b",
      amount: 3800,
      annualizedCost: 18000,
      explanation: "Shopping spend jumped 68% above your 3-month average this period (₹6,399 vs avg ₹3,809).",
      evidence: ["Latest month: ₹6,399","3-month baseline: ₹3,809","68% above normal","Extra spend: ₹2,590 this month"],
    },
    {
      id: "duplicate-payment",
      type: "DUPLICATE_PAYMENT",
      severity: "HIGH",
      title: "Possible duplicate charge",
      merchant: "Swiggy",
      amount: 570,
      annualizedCost: 6840,
      explanation: "Swiggy charged ₹570 twice within the same day in February. This appears to be a double-billing that may be recoverable.",
      evidence: ["1 duplicate pair detected","₹570 charged on Feb 14 and Feb 14","Same order amount both times","Contact Swiggy support to dispute"],
    },
    {
      id: "impulse-ecommerce",
      type: "IMPULSE_ECOMMERCE",
      severity: "MEDIUM",
      title: "Impulse online shopping sessions",
      merchant: "Amazon / Flipkart",
      category: "SHOPPING",
      categoryDisplayName: "Shopping",
      categoryColor: "#f59e0b",
      amount: 1800,
      annualizedCost: 21600,
      explanation: "Detected 2 days where 3+ e-commerce transactions happened in a single sitting — a classic impulse buying pattern.",
      evidence: ["2 impulse shopping sessions","₹5,400 total across sessions","Amazon and Flipkart","Avg ₹2,700 per impulse session"],
    },
    {
      id: "cluster-blue-tokai",
      type: "CONVENIENCE_CLUSTER",
      severity: "LOW",
      title: "Habit spending at Blue Tokai Coffee",
      merchant: "Blue Tokai Coffee",
      category: "COFFEE_CAFES",
      categoryDisplayName: "Coffee & Cafés",
      categoryColor: "#d97706",
      amount: 1120,
      annualizedCost: 13440,
      explanation: "You visited Blue Tokai Coffee 5 times in a single week. Daily coffee runs are a classic budget leak that compounds significantly.",
      evidence: ["5 visits in one 7-day window","₹1,120 spent that week","14 total visits over 4 months","Est. ₹13,440/year at current rate"],
    },
  ];

  return {
    leaks,
    totalAnnualWaste: leaks.reduce((s, l) => s + l.annualizedCost, 0),
    highCount:   leaks.filter((l) => l.severity === "HIGH").length,
    mediumCount: leaks.filter((l) => l.severity === "MEDIUM").length,
    lowCount:    leaks.filter((l) => l.severity === "LOW").length,
    hasRealData: false,
  };
}
