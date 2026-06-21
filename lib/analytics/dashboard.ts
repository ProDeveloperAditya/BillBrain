/**
 * Dashboard analytics — server-side only, called from server components.
 * No "use server" directive: these are regular async functions, not Server Actions.
 */

import { db } from "@/lib/db";

// ─── Category display metadata ────────────────────────────────────────────────

export const CATEGORY_META: Record<string, { displayName: string; color: string }> = {
  FOOD_DINING:   { displayName: "Food & Dining",   color: "#f97316" },
  GROCERIES:     { displayName: "Groceries",        color: "#84cc16" },
  SUBSCRIPTIONS: { displayName: "Subscriptions",   color: "#8b5cf6" },
  TRANSPORT:     { displayName: "Transport",        color: "#06b6d4" },
  SHOPPING:      { displayName: "Shopping",         color: "#f59e0b" },
  HEALTHCARE:    { displayName: "Healthcare",       color: "#10b981" },
  EDUCATION:     { displayName: "Education",        color: "#3b82f6" },
  SALARY_INCOME: { displayName: "Salary & Income",  color: "#22c55e" },
  RENT_HOUSING:  { displayName: "Rent & Housing",   color: "#ef4444" },
  UTILITIES:     { displayName: "Utilities",        color: "#64748b" },
  ENTERTAINMENT: { displayName: "Entertainment",    color: "#ec4899" },
  COFFEE_CAFES:  { displayName: "Coffee & Cafés",   color: "#d97706" },
  TRAVEL:        { displayName: "Travel",           color: "#0ea5e9" },
  INSURANCE:     { displayName: "Insurance",        color: "#6366f1" },
  BANKING_FEES:  { displayName: "Banking Fees",     color: "#9ca3af" },
  TRANSFERS:     { displayName: "Transfers",        color: "#6b7280" },
  INVESTMENTS:   { displayName: "Investments",      color: "#14b8a6" },
  OTHER:         { displayName: "Other",            color: "#94a3b8" },
};

const catMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { displayName: cat, color: "#94a3b8" };

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const SEVERITY_ORDER: Record<string, number> = { HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 };

// ─── Return types (fully serialisable — no Date / Decimal objects) ────────────

export interface DashboardKPI {
  totalSpend: number;
  totalSpendMoM: number;       // % change vs prev month; positive = more spending
  avoidableSpend: number;
  avoidablePct: number;
  activeSubscriptions: number;
  subscriptionMonthlyTotal: number;
  savingsScore: number;        // 0–100
  monthLabel: string;          // "April 2026"
  currency: string;
}

export interface TrendPoint {
  monthLabel: string;
  totalSpend: number;
  recurringTotal: number;
}

export interface CategoryPoint {
  category: string;
  displayName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface WeeklyPoint {
  day: string;
  amount: number;
}

export interface RecentTx {
  id: string;
  date: string;               // ISO string
  description: string;
  normalizedMerchant: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string;
  categoryDisplayName: string;
  categoryColor: string;
  isFlagged: boolean;
  isDuplicate: boolean;
}

export interface InsightItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
}

export interface SubscriptionItem {
  id: string;
  merchantName: string;
  averageAmount: number;
  annualCost: number;
  isPossiblyForgotten: boolean;
}

export interface UnusualAlert {
  id: string;
  description: string;
  normalizedMerchant: string;
  amount: number;
  category: string;
  categoryDisplayName: string;
  date: string;
}

export interface DashboardData {
  kpi: DashboardKPI;
  monthlyTrend: TrendPoint[];
  categoryBreakdown: CategoryPoint[];
  weeklyPattern: WeeklyPoint[];
  recentTransactions: RecentTx[];
  insights: InsightItem[];
  subscriptions: SubscriptionItem[];
  unusualAlerts: UnusualAlert[];
  hasRealData: boolean;
}

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const now = new Date();

  // Fast check: does this user have any transactions at all?
  const txCount = await db.transaction.count({ where: { userId } });
  if (txCount === 0) return buildDemoFallback();

  // Anchor the dashboard to the most recent month that has activity, so importing
  // a past statement (e.g. last month's) still populates everything instead of
  // showing an empty current month.
  const latestTx = await db.transaction.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const ref = latestTx?.date ?? now;
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();

  const currentMonthStart = new Date(Date.UTC(y, m, 1));
  const prevMonthStart    = new Date(Date.UTC(y, m - 1, 1));
  const nextMonthStart    = new Date(Date.UTC(y, m + 1, 1));
  const trendStart        = new Date(Date.UTC(y, m - 5, 1));

  // ── Parallel fetches ────────────────────────────────────────────────────────
  const [
    currentSnapshot,
    snapshots,
    recentTxns,
    currentMonthDebits,
    rawInsights,
    subscriptions,
    flaggedTxns,
    trendTxns,
  ] = await Promise.all([
    db.spendingSnapshot.findFirst({
      where: { userId, month: currentMonthStart },
    }),
    db.spendingSnapshot.findMany({
      where: { userId },
      orderBy: { month: "asc" },
      take: 4,
    }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.transaction.findMany({
      where: {
        userId,
        type: "DEBIT",
        date: { gte: currentMonthStart, lt: nextMonthStart },
      },
      select: { date: true, amount: true, category: true },
    }),
    db.insight.findMany({
      where: { userId, isDismissed: false },
      orderBy: { generatedAt: "desc" },
      take: 10,
    }),
    db.recurringCharge.findMany({
      where: { userId, isCancelled: false },
      orderBy: { averageAmount: "desc" },
    }),
    db.transaction.findMany({
      where: {
        userId,
        isFlagged: true,
        isDuplicate: false,
        date: { gte: currentMonthStart, lt: nextMonthStart },
      },
      orderBy: { amount: "desc" },
      take: 3,
      select: {
        id: true,
        description: true,
        normalizedMerchant: true,
        amount: true,
        category: true,
        date: true,
      },
    }),
    // Last 6 months of debits for the trend chart (computed, not snapshot-dependent)
    db.transaction.findMany({
      where: {
        userId,
        type: "DEBIT",
        date: { gte: trendStart, lt: nextMonthStart },
      },
      select: { date: true, amount: true },
    }),
  ]);

  // ── KPI ─────────────────────────────────────────────────────────────────────
  const totalSpend = currentSnapshot
    ? Number(currentSnapshot.totalSpend)
    : currentMonthDebits.reduce((s, t) => s + Number(t.amount), 0);

  const avoidableSpend = currentSnapshot
    ? Number(currentSnapshot.avoidableSpend)
    : 0;

  const savingsScore = currentSnapshot?.savingsScore ?? 65;

  // Monthly debit totals (computed from transactions, snapshot-independent)
  const trendMap: Record<string, number> = {};
  trendTxns.forEach((t) => {
    const key = `${t.date.getUTCFullYear()}-${t.date.getUTCMonth()}`;
    trendMap[key] = (trendMap[key] ?? 0) + Number(t.amount);
  });

  // prev month for MoM delta (snapshot if present, else computed)
  const prevSnapshot = snapshots.find(
    (s) => s.month.getTime() === prevMonthStart.getTime()
  );
  const prevKey = `${prevMonthStart.getUTCFullYear()}-${prevMonthStart.getUTCMonth()}`;
  const prevSpend = prevSnapshot ? Number(prevSnapshot.totalSpend) : (trendMap[prevKey] ?? null);
  const totalSpendMoM =
    prevSpend && prevSpend > 0
      ? Math.round(((totalSpend - prevSpend) / prevSpend) * 100)
      : 0;

  const subscriptionMonthlyTotal = subscriptions.reduce(
    (s, r) => s + Number(r.averageAmount),
    0
  );

  const kpi: DashboardKPI = {
    totalSpend,
    totalSpendMoM,
    avoidableSpend,
    avoidablePct:
      totalSpend > 0 ? Math.round((avoidableSpend / totalSpend) * 100) : 0,
    activeSubscriptions: subscriptions.length,
    subscriptionMonthlyTotal: Math.round(subscriptionMonthlyTotal),
    savingsScore: Math.round(savingsScore),
    monthLabel: `${MONTH_LABELS[m]} ${y}`,
    currency: "INR",
  };

  // ── Monthly trend (last 6 months with activity, computed from transactions) ──
  const monthlyTrend: TrendPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const amt = trendMap[key] ?? 0;
    // Skip leading empty months, but keep gaps once data has started
    if (amt > 0 || monthlyTrend.length > 0) {
      monthlyTrend.push({
        monthLabel: MONTH_LABELS[d.getUTCMonth()],
        totalSpend: Math.round(amt),
        recurringTotal: 0,
      });
    }
  }

  // ── Category breakdown ───────────────────────────────────────────────────────
  let categoryBreakdown: CategoryPoint[] = [];

  if (currentSnapshot) {
    const raw = currentSnapshot.categoryBreakdown as Record<
      string,
      { amount: number; count: number }
    >;
    categoryBreakdown = Object.entries(raw)
      .filter(([cat, v]) => v.amount > 0 && cat !== "SALARY_INCOME")
      .map(([cat, v]) => {
        const meta = catMeta(cat);
        return {
          category: cat,
          displayName: meta.displayName,
          amount: v.amount,
          percentage:
            totalSpend > 0 ? Math.round((v.amount / totalSpend) * 100) : 0,
          color: meta.color,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);
  } else {
    // Compute from this month's debits if no snapshot
    const catMap: Record<string, number> = {};
    currentMonthDebits.forEach((t) => {
      catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount);
    });
    categoryBreakdown = Object.entries(catMap)
      .filter(([cat]) => cat !== "SALARY_INCOME")
      .map(([cat, amount]) => ({
        category: cat,
        displayName: catMeta(cat).displayName,
        amount,
        percentage: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
        color: catMeta(cat).color,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);
  }

  // ── Weekly spending pattern (Mon–Sun, current month) ────────────────────────
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayTotals = new Array(7).fill(0) as number[];
  currentMonthDebits.forEach((t) => {
    dayTotals[t.date.getUTCDay()] += Number(t.amount);
  });
  // Reorder Mon(1)…Sun(0)
  const weeklyPattern: WeeklyPoint[] = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
    day: DAY_NAMES[i],
    amount: Math.round(dayTotals[i]),
  }));

  // ── Recent transactions ──────────────────────────────────────────────────────
  const recentTransactions: RecentTx[] = recentTxns.map((t) => {
    const meta = catMeta(t.category);
    return {
      id: t.id,
      date: t.date.toISOString(),
      description: t.description ?? t.rawDescription ?? t.normalizedMerchant ?? "—",
      normalizedMerchant: t.normalizedMerchant ?? "",
      amount: Number(t.amount),
      type: t.type as "DEBIT" | "CREDIT",
      category: t.category,
      categoryDisplayName: meta.displayName,
      categoryColor: meta.color,
      isFlagged: t.isFlagged,
      isDuplicate: t.isDuplicate,
    };
  });

  // ── Insights (sorted by severity desc) ──────────────────────────────────────
  const insights: InsightItem[] = rawInsights
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
    )
    .slice(0, 3)
    .map((ins) => ({
      id: ins.id,
      type: ins.type,
      severity: ins.severity,
      title: ins.title,
      body: ins.body,
    }));

  // ── Subscription summary ─────────────────────────────────────────────────────
  const subscriptionItems: SubscriptionItem[] = subscriptions.map((r) => ({
    id: r.id,
    merchantName: r.merchantName,
    averageAmount: Math.round(Number(r.averageAmount)),
    annualCost: Math.round(Number(r.annualCost)),
    isPossiblyForgotten: r.isPossiblyForgotten,
  }));

  // ── Unusual alerts ───────────────────────────────────────────────────────────
  const unusualAlerts: UnusualAlert[] = flaggedTxns.map((t) => ({
    id: t.id,
    description: t.description ?? t.normalizedMerchant ?? "Unknown",
    normalizedMerchant: t.normalizedMerchant ?? "",
    amount: Number(t.amount),
    category: t.category,
    categoryDisplayName: catMeta(t.category).displayName,
    date: t.date.toISOString(),
  }));

  return {
    kpi,
    monthlyTrend,
    categoryBreakdown,
    weeklyPattern,
    recentTransactions,
    insights,
    subscriptions: subscriptionItems,
    unusualAlerts,
    hasRealData: true,
  };
}

// ─── Demo fallback (new user, no data yet) ─────────────────────────────────────

function buildDemoFallback(): DashboardData {
  return {
    kpi: {
      totalSpend: 42380,
      totalSpendMoM: 8,
      avoidableSpend: 8140,
      avoidablePct: 19,
      activeSubscriptions: 5,
      subscriptionMonthlyTotal: 2265,
      savingsScore: 65,
      monthLabel: "Demo Month",
      currency: "INR",
    },
    monthlyTrend: [
      { monthLabel: "Jan", totalSpend: 39200, recurringTotal: 21000 },
      { monthLabel: "Feb", totalSpend: 46800, recurringTotal: 21000 },
      { monthLabel: "Mar", totalSpend: 41500, recurringTotal: 21265 },
      { monthLabel: "Apr", totalSpend: 42380, recurringTotal: 21265 },
    ],
    categoryBreakdown: [
      { category: "RENT_HOUSING",  displayName: "Rent & Housing",  amount: 18000, percentage: 42, color: "#ef4444" },
      { category: "FOOD_DINING",   displayName: "Food & Dining",   amount: 4430,  percentage: 10, color: "#f97316" },
      { category: "COFFEE_CAFES",  displayName: "Coffee & Cafés",  amount: 3900,  percentage: 9,  color: "#d97706" },
      { category: "SHOPPING",      displayName: "Shopping",        amount: 4497,  percentage: 11, color: "#f59e0b" },
      { category: "SUBSCRIPTIONS", displayName: "Subscriptions",   amount: 2115,  percentage: 5,  color: "#8b5cf6" },
      { category: "UTILITIES",     displayName: "Utilities",       amount: 3449,  percentage: 8,  color: "#64748b" },
      { category: "TRANSPORT",     displayName: "Transport",       amount: 1110,  percentage: 3,  color: "#06b6d4" },
    ],
    weeklyPattern: [
      { day: "Mon", amount: 3200 },
      { day: "Tue", amount: 1800 },
      { day: "Wed", amount: 4100 },
      { day: "Thu", amount: 2600 },
      { day: "Fri", amount: 5800 },
      { day: "Sat", amount: 7200 },
      { day: "Sun", amount: 6100 },
    ],
    recentTransactions: [
      { id: "d1", date: new Date().toISOString(), description: "Zomato — Late Night",    normalizedMerchant: "Zomato",            amount: 520,   type: "DEBIT",  category: "FOOD_DINING",   categoryDisplayName: "Food & Dining",  categoryColor: "#f97316", isFlagged: true,  isDuplicate: false },
      { id: "d2", date: new Date().toISOString(), description: "Rent — April 2026",     normalizedMerchant: "Rent",              amount: 18000, type: "DEBIT",  category: "RENT_HOUSING",  categoryDisplayName: "Rent & Housing", categoryColor: "#ef4444", isFlagged: false, isDuplicate: false },
      { id: "d3", date: new Date().toISOString(), description: "Netflix Monthly",       normalizedMerchant: "Netflix",           amount: 649,   type: "DEBIT",  category: "SUBSCRIPTIONS", categoryDisplayName: "Subscriptions",  categoryColor: "#8b5cf6", isFlagged: false, isDuplicate: false },
      { id: "d4", date: new Date().toISOString(), description: "Salary — April 2026",  normalizedMerchant: "Salary",            amount: 75000, type: "CREDIT", category: "SALARY_INCOME", categoryDisplayName: "Salary & Income",categoryColor: "#22c55e", isFlagged: false, isDuplicate: false },
      { id: "d5", date: new Date().toISOString(), description: "Blue Tokai — Morning", normalizedMerchant: "Blue Tokai Coffee", amount: 290,   type: "DEBIT",  category: "COFFEE_CAFES",  categoryDisplayName: "Coffee & Cafés", categoryColor: "#d97706", isFlagged: false, isDuplicate: false },
    ],
    insights: [
      { id: "i1", type: "LEAK",               severity: "HIGH",   title: "Late-night delivery costing ₹74,400/year",  body: "Import your bank statement to see your personalised spending analysis." },
      { id: "i2", type: "SUBSCRIPTION_ALERT", severity: "HIGH",   title: "Forgotten subscription detected",           body: "Connect your accounts to discover subscriptions you may have forgotten about." },
      { id: "i3", type: "SAVINGS_OPPORTUNITY",severity: "MEDIUM", title: "Potential ₹8,000/year savings on streaming", body: "Upload your data to get AI-powered savings recommendations." },
    ],
    subscriptions: [
      { id: "s1", merchantName: "Cult.fit",        averageAmount: 899, annualCost: 10788, isPossiblyForgotten: true  },
      { id: "s2", merchantName: "Netflix",         averageAmount: 649, annualCost: 7788,  isPossiblyForgotten: false },
      { id: "s3", merchantName: "Airtel Broadband",averageAmount: 999, annualCost: 11988, isPossiblyForgotten: false },
      { id: "s4", merchantName: "Amazon Prime",    averageAmount: 299, annualCost: 3588,  isPossiblyForgotten: false },
      { id: "s5", merchantName: "Spotify",         averageAmount: 119, annualCost: 1428,  isPossiblyForgotten: false },
    ],
    unusualAlerts: [],
    hasRealData: false,
  };
}
