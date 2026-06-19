/**
 * Recurring charge detector — server-side only.
 * Input: a user's transaction history.
 * Output: structured subscription intelligence.
 */

import { db } from "@/lib/db";
import { CATEGORY_META } from "./dashboard";

// ─── Known subscription merchants (lowercase canonical names) ─────────────────

const KNOWN_SUB_MERCHANTS = new Set([
  "netflix","spotify","amazon prime","disney+ hotstar","cult.fit","google one",
  "youtube premium","microsoft 365","apple music","apple one","apple tv",
  "zee5","sonyliv","jiocinema","mxplayer","hotstar","primevideo",
  "dropbox","notion","figma","canva","slack","zoom","upstox","zerodha",
  "airtel","jio","act fibernet","hathway","bsnl","neeladri",
  "cred","phonepe","paytm","mobikwik",
]);

// ─── Output types ─────────────────────────────────────────────────────────────

export type Cadence = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY" | "IRREGULAR";

export interface DetectedSubscription {
  id: string;
  merchantName: string;
  normalizedName: string;
  category: string;
  categoryDisplayName: string;
  categoryColor: string;
  cadence: Cadence;
  cadenceLabel: string;
  averageAmount: number;
  latestAmount: number;
  annualCost: number;
  monthlyCost: number;
  confidence: number;          // 0–100
  firstSeenDate: string;       // ISO date
  lastChargedDate: string;     // ISO date
  estimatedNextDate: string;   // ISO date
  daysSinceLastCharge: number;
  monthsActive: number;
  chargeCount: number;
  isPriceIncrease: boolean;
  previousAmount?: number;     // avg of all-but-latest
  priceIncreasePct?: number;
  isDormant: boolean;
  isKnownSubscription: boolean;
}

export interface DuplicateRiskGroup {
  category: string;
  categoryDisplayName: string;
  categoryColor: string;
  subscriptions: DetectedSubscription[];
  potentialSaving: number;     // cheapest one to cancel
}

export interface SubscriptionData {
  active: DetectedSubscription[];
  priceIncreases: DetectedSubscription[];
  dormant: DetectedSubscription[];
  duplicateRisks: DuplicateRiskGroup[];
  totalAnnualCost: number;
  totalMonthlyCost: number;
  activeCount: number;
  dormantCount: number;
  priceIncreaseCount: number;
  duplicateRiskCount: number;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

const CADENCE_LABELS: Record<Cadence, string> = {
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Every 6 months",
  YEARLY: "Yearly",
  IRREGULAR: "Irregular",
};

function gapToCadence(avgDays: number): { cadence: Cadence; expectedDays: number } {
  if (avgDays < 10)  return { cadence: "WEEKLY",      expectedDays: 7   };
  if (avgDays < 20)  return { cadence: "FORTNIGHTLY",  expectedDays: 14  };
  if (avgDays < 45)  return { cadence: "MONTHLY",      expectedDays: 30  };
  if (avgDays < 120) return { cadence: "QUARTERLY",    expectedDays: 91  };
  if (avgDays < 270) return { cadence: "HALF_YEARLY",  expectedDays: 182 };
  if (avgDays < 500) return { cadence: "YEARLY",       expectedDays: 365 };
  return                    { cadence: "IRREGULAR",    expectedDays: avgDays };
}

function annualMultiplier(cadence: Cadence): number {
  return { WEEKLY: 52, FORTNIGHTLY: 26, MONTHLY: 12, QUARTERLY: 4,
           HALF_YEARLY: 2, YEARLY: 1, IRREGULAR: 12 }[cadence];
}

function monthlyMultiplier(cadence: Cadence): number {
  return { WEEKLY: 4.33, FORTNIGHTLY: 2.17, MONTHLY: 1, QUARTERLY: 1/3,
           HALF_YEARLY: 1/6, YEARLY: 1/12, IRREGULAR: 1 }[cadence];
}

// Coefficient of variation: stddev / mean. Treats amounts robustly.
function coefficientOfVariation(amounts: number[]): number {
  if (amounts.length < 2) return 0;
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (mean === 0) return 1;
  const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
  return Math.sqrt(variance) / mean;
}

// Date-gap regularity: returns true if gaps are consistent (cv < 0.3)
function isRegularPattern(dates: Date[]): boolean {
  if (dates.length < 3) return true;
  const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
  return coefficientOfVariation(gaps) < 0.3;
}

// ─── Core detector ────────────────────────────────────────────────────────────

export function detectRecurring(transactions: TxRow[], now = new Date()): DetectedSubscription[] {
  // Group DEBIT transactions by normalized merchant
  const groups = new Map<string, TxRow[]>();
  for (const tx of transactions) {
    if (tx.amount <= 0) continue;
    const key = (tx.normalizedMerchant ?? tx.description ?? "unknown").toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const results: DetectedSubscription[] = [];

  for (const [normalizedKey, txs] of groups) {
    // Sort chronologically
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Count distinct months
    const months = new Set(sorted.map((t) => t.date.toISOString().slice(0, 7)));
    if (months.size < 3) continue;

    const amounts  = sorted.map((t) => t.amount);
    const mean     = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const cv       = coefficientOfVariation(amounts);

    // Variance gate: skip if wildly inconsistent (cv > 0.30)
    if (cv > 0.30) continue;

    const amountConsistent = cv <= 0.15;
    const dates            = sorted.map((t) => t.date);
    const regularPattern   = isRegularPattern(dates);

    // Day gaps → cadence
    const gaps    = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
    const avgGap  = gaps.reduce((a, b) => a + b, 0) / (gaps.length || 1);
    const { cadence, expectedDays } = gapToCadence(avgGap);

    const isKnownSub = KNOWN_SUB_MERCHANTS.has(normalizedKey);

    // Confidence score
    let confidence = 40; // base: 3+ months
    if (months.size >= 5) confidence += 10;
    if (amountConsistent)  confidence += 20;
    if (regularPattern)    confidence += 20;
    if (isKnownSub)        confidence += 20;
    confidence = Math.min(confidence, 100);

    const latestAmount = amounts[amounts.length - 1];
    const latestDate   = dates[dates.length - 1];

    // Price increase: latest > average of all-but-latest by >5%
    let isPriceIncrease = false;
    let previousAmount: number | undefined;
    let priceIncreasePct: number | undefined;
    if (amounts.length >= 2) {
      const prevAmounts = amounts.slice(0, -1);
      const prevAvg     = prevAmounts.reduce((a, b) => a + b, 0) / prevAmounts.length;
      const delta       = (latestAmount - prevAvg) / prevAvg;
      if (delta > 0.05) {
        isPriceIncrease   = true;
        previousAmount    = prevAvg;
        priceIncreasePct  = Math.round(delta * 100);
      }
    }

    // Dormant: last charge >45 days ago
    const daysSince = daysBetween(latestDate, now);
    const isDormant = daysSince > 45;

    // Category meta
    const category    = sorted[sorted.length - 1].category || "SUBSCRIPTIONS";
    const meta        = CATEGORY_META[category] ?? CATEGORY_META.OTHER;
    const displayName = sorted.find((t) => (t.normalizedMerchant ?? t.description))
                          ?.normalizedMerchant
                        ?? sorted[0].description
                        ?? normalizedKey;

    results.push({
      id:                   normalizedKey,
      merchantName:         displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
      normalizedName:       normalizedKey,
      category,
      categoryDisplayName:  meta.displayName,
      categoryColor:        meta.color,
      cadence,
      cadenceLabel:         CADENCE_LABELS[cadence],
      averageAmount:        Math.round(mean * 100) / 100,
      latestAmount:         Math.round(latestAmount * 100) / 100,
      annualCost:           Math.round(mean * annualMultiplier(cadence) * 100) / 100,
      monthlyCost:          Math.round(mean * monthlyMultiplier(cadence) * 100) / 100,
      confidence,
      firstSeenDate:        isoDate(dates[0]),
      lastChargedDate:      isoDate(latestDate),
      estimatedNextDate:    isoDate(addDays(latestDate, expectedDays)),
      daysSinceLastCharge:  daysSince,
      monthsActive:         months.size,
      chargeCount:          sorted.length,
      isPriceIncrease,
      previousAmount:       previousAmount ? Math.round(previousAmount * 100) / 100 : undefined,
      priceIncreasePct,
      isDormant,
      isKnownSubscription:  isKnownSub,
    });
  }

  return results.sort((a, b) => b.annualCost - a.annualCost);
}

// ─── Duplicate risk grouping ───────────────────────────────────────────────────

function findDuplicateRisks(active: DetectedSubscription[]): DuplicateRiskGroup[] {
  const catGroups = new Map<string, DetectedSubscription[]>();
  for (const s of active) {
    if (!catGroups.has(s.category)) catGroups.set(s.category, []);
    catGroups.get(s.category)!.push(s);
  }

  const risks: DuplicateRiskGroup[] = [];
  for (const [category, subs] of catGroups) {
    if (subs.length < 2) continue;
    // Only flag categories where duplication is actually a problem
    const OVERLAP_CATEGORIES = new Set([
      "SUBSCRIPTIONS", "ENTERTAINMENT", "HEALTHCARE", "FOOD_DINING", "GROCERIES",
    ]);
    if (!OVERLAP_CATEGORIES.has(category)) continue;

    const sorted   = [...subs].sort((a, b) => a.annualCost - b.annualCost);
    const cheapest = sorted[0].annualCost;
    risks.push({
      category,
      categoryDisplayName: subs[0].categoryDisplayName,
      categoryColor:       subs[0].categoryColor,
      subscriptions:       sorted.reverse(), // most expensive first
      potentialSaving:     cheapest,
    });
  }
  return risks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSubscriptionData(userId: string): Promise<SubscriptionData> {
  const rawTxs = await db.transaction.findMany({
    where: { userId, type: "DEBIT", isDuplicate: false, amount: { gt: 0 } },
    select: {
      id: true, date: true, amount: true, category: true,
      normalizedMerchant: true, description: true,
    },
    orderBy: { date: "asc" },
  });

  if (rawTxs.length === 0) return buildDemoSubscriptions();

  const txs: TxRow[] = rawTxs.map((t) => ({
    id:                 t.id,
    date:               t.date,
    amount:             Number(t.amount),
    category:           t.category,
    normalizedMerchant: t.normalizedMerchant,
    description:        t.description,
  }));

  const all   = detectRecurring(txs);
  const active = all.filter((s) => !s.isDormant);
  const dormant = all.filter((s) => s.isDormant);

  const priceIncreases = active.filter((s) => s.isPriceIncrease);
  const duplicateRisks = findDuplicateRisks(active);

  const totalMonthlyCost = active.reduce((s, r) => s + r.monthlyCost, 0);
  const totalAnnualCost  = active.reduce((s, r) => s + r.annualCost,  0);

  return {
    active,
    priceIncreases,
    dormant,
    duplicateRisks,
    totalAnnualCost:  Math.round(totalAnnualCost),
    totalMonthlyCost: Math.round(totalMonthlyCost),
    activeCount:      active.length,
    dormantCount:     dormant.length,
    priceIncreaseCount: priceIncreases.length,
    duplicateRiskCount: duplicateRisks.reduce((s, g) => s + g.subscriptions.length, 0),
    hasRealData: true,
  };
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

function demo(
  id: string, merchantName: string, category: string,
  cadence: Cadence, avg: number, months: number,
  extra: Partial<DetectedSubscription> = {}
): DetectedSubscription {
  const meta  = CATEGORY_META[category] ?? CATEGORY_META.OTHER;
  const ann   = Math.round(avg * annualMultiplier(cadence));
  const mo    = Math.round(avg * monthlyMultiplier(cadence) * 100) / 100;
  const last  = new Date("2026-04-07");
  const first = new Date("2026-01-07");
  const { expectedDays } = gapToCadence(cadence === "MONTHLY" ? 30 : 365);
  return {
    id, merchantName, normalizedName: id, category,
    categoryDisplayName: meta.displayName, categoryColor: meta.color,
    cadence, cadenceLabel: CADENCE_LABELS[cadence],
    averageAmount: avg, latestAmount: avg, annualCost: ann, monthlyCost: mo,
    confidence: KNOWN_SUB_MERCHANTS.has(id) ? 90 : 70,
    firstSeenDate: isoDate(first), lastChargedDate: isoDate(last),
    estimatedNextDate: isoDate(addDays(last, expectedDays)),
    daysSinceLastCharge: 16, monthsActive: months, chargeCount: months,
    isPriceIncrease: false, isDormant: false, isKnownSubscription: KNOWN_SUB_MERCHANTS.has(id),
    ...extra,
  };
}

function buildDemoSubscriptions(): SubscriptionData {
  const active: DetectedSubscription[] = [
    demo("netflix",        "Netflix",          "SUBSCRIPTIONS", "MONTHLY",  649, 4,
      { isPriceIncrease: true, previousAmount: 499, priceIncreasePct: 30, latestAmount: 649 }),
    demo("spotify",        "Spotify",          "SUBSCRIPTIONS", "MONTHLY",  119, 4),
    demo("amazon prime",   "Amazon Prime",     "SUBSCRIPTIONS", "MONTHLY",  299, 4),
    demo("disney+ hotstar","Disney+ Hotstar",  "SUBSCRIPTIONS", "MONTHLY",  299, 4),
    demo("airtel",         "Airtel Broadband", "UTILITIES",     "MONTHLY", 1199, 4),
    demo("cult.fit",       "Cult.fit",         "HEALTHCARE",    "MONTHLY",  899, 4,
      { isDormant: true, daysSinceLastCharge: 62 }),
  ];

  const priceIncreases = active.filter((s) => s.isPriceIncrease);
  const dormant        = active.filter((s) => s.isDormant);
  const trueActive     = active.filter((s) => !s.isDormant);
  const duplicateRisks = findDuplicateRisks(trueActive);

  const totalMonthlyCost = trueActive.reduce((s, r) => s + r.monthlyCost, 0);
  const totalAnnualCost  = trueActive.reduce((s, r) => s + r.annualCost,  0);

  return {
    active: trueActive, priceIncreases, dormant, duplicateRisks,
    totalAnnualCost: Math.round(totalAnnualCost),
    totalMonthlyCost: Math.round(totalMonthlyCost),
    activeCount: trueActive.length, dormantCount: dormant.length,
    priceIncreaseCount: priceIncreases.length,
    duplicateRiskCount: duplicateRisks.reduce((s, g) => s + g.subscriptions.length, 0),
    hasRealData: false,
  };
}
