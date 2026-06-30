import { db } from "@/lib/db";
import type { CategoryName } from "@prisma/client";
import { forecastSpend } from "@/lib/analytics/spendingForecast";
import { detectAnomalies, buildHistories } from "@/lib/analytics/anomalyDetector";

const CATEGORY_LABELS: Record<CategoryName, string> = {
  FOOD_DINING:     "Food & Dining",
  GROCERIES:       "Groceries",
  SUBSCRIPTIONS:   "Subscriptions",
  TRANSPORT:       "Transport",
  SHOPPING:        "Shopping",
  HEALTHCARE:      "Healthcare",
  EDUCATION:       "Education",
  SALARY_INCOME:   "Salary / Income",
  RENT_HOUSING:    "Rent & Housing",
  UTILITIES:       "Utilities",
  ENTERTAINMENT:   "Entertainment",
  COFFEE_CAFES:    "Coffee & Cafés",
  TRAVEL:          "Travel",
  INSURANCE:       "Insurance",
  BANKING_FEES:    "Banking Fees",
  TRANSFERS:       "Transfers",
  INVESTMENTS:     "Investments",
  OTHER:           "Other",
};

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export async function buildContext(userId: string, userQuery: string): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [transactions, insights, recurring, currentMonthTxs, snapshot, pastSnapshots, pastTxs] = await Promise.all([
    db.transaction.findMany({
      where: { userId, isDuplicate: false },
      orderBy: { date: "desc" },
      take: 30,
      select: {
        date: true,
        amount: true,
        type: true,
        category: true,
        normalizedMerchant: true,
        rawDescription: true,
        isRecurring: true,
        tags: true,
      },
    }),
    db.insight.findMany({
      where: { userId, isDismissed: false },
      orderBy: { generatedAt: "desc" },
      take: 5,
      select: { type: true, severity: true, title: true, body: true },
    }),
    db.recurringCharge.findMany({
      where: { userId, isCancelled: false },
      orderBy: { annualCost: "desc" },
      select: {
        merchantName: true,
        frequency: true,
        averageAmount: true,
        annualCost: true,
        lastChargedDate: true,
        isPossiblyForgotten: true,
      },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: monthStart }, type: "DEBIT", isDuplicate: false },
      select: { amount: true, category: true },
    }),
    db.spendingSnapshot.findFirst({
      where: { userId },
      orderBy: { month: "desc" },
      select: { totalSpend: true, savingsScore: true, topCategories: true },
    }),
    db.spendingSnapshot.findMany({
      where: { userId, month: { gte: sixMonthsAgo } },
      orderBy: { month: "asc" },
      select: { month: true, totalSpend: true },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: sixMonthsAgo }, type: "DEBIT", isDuplicate: false },
      select: { amount: true, category: true, date: true },
    }),
  ]);

  // ── Current month category breakdown ──────────────────────────────────────
  const categoryTotals: Partial<Record<CategoryName, number>> = {};
  for (const tx of currentMonthTxs) {
    const cat = tx.category as CategoryName;
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(tx.amount);
  }

  // ── Spend forecast (WLS) ──────────────────────────────────────────────────
  const monthlyAmounts = pastSnapshots.map((s) => Number(s.totalSpend));
  const forecast = monthlyAmounts.length >= 3 ? forecastSpend(monthlyAmounts) : null;

  // ── Z-score anomaly detection over 6-month category history ──────────────
  const catMonthMap: Record<string, Record<string, number>> = {};
  for (const tx of pastTxs) {
    const cat = tx.category as string;
    const monthKey = new Date(tx.date).toISOString().slice(0, 7);
    if (!catMonthMap[cat]) catMonthMap[cat] = {};
    catMonthMap[cat][monthKey] = (catMonthMap[cat][monthKey] ?? 0) + Number(tx.amount);
  }
  // Convert month-keyed map → sorted number[] for each category
  const spendByCategoryArrays: Record<string, number[]> = {};
  for (const [cat, monthMap] of Object.entries(catMonthMap)) {
    spendByCategoryArrays[cat] = Object.keys(monthMap)
      .sort()
      .map((k) => monthMap[k]);
  }
  const histories = buildHistories(spendByCategoryArrays);
  const anomalies = detectAnomalies(histories);

  const sortedCategories = (Object.entries(categoryTotals) as [CategoryName, number][])
    .filter(([cat]) => cat !== "SALARY_INCOME" && cat !== "TRANSFERS" && cat !== "INVESTMENTS")
    .sort((a, b) => b[1] - a[1]);

  const totalSpend = sortedCategories.reduce((s, [, v]) => s + v, 0);
  const topCategory = sortedCategories[0]?.[0] ?? null;

  // ── Subscription tally ────────────────────────────────────────────────────
  const subCount = recurring.length;
  const subMonthly = recurring.reduce((s, r) => s + Number(r.averageAmount), 0);

  // ── Late-night order count ────────────────────────────────────────────────
  const lateNightCount = transactions.filter((tx) => {
    const h = new Date(tx.date).getUTCHours();
    return (h >= 23 || h < 3) && (tx.tags.includes("late-night") || tx.category === "FOOD_DINING");
  }).length;

  // ── Build prompt sections ──────────────────────────────────────────────────
  const lines: string[] = [];

  lines.push("You are BillBrain AI, a personal finance assistant. Be concise, specific, and action-oriented.");
  lines.push("Answer using the user's actual financial data provided below. Do not fabricate numbers.");
  lines.push("");
  lines.push("─── FINANCIAL OVERVIEW ─────────────────────────────────────────────────────");

  if (snapshot) {
    lines.push(`Total spend: ₹${fmt(Number(snapshot.totalSpend))} (last import period)`);
    if (snapshot.savingsScore != null)
      lines.push(`Savings score: ${Math.round(snapshot.savingsScore)}/100`);
  }

  if (totalSpend > 0) {
    lines.push(`Current month spend: ₹${fmt(totalSpend)}`);
  }

  if (topCategory) {
    lines.push(`Category #1: ${CATEGORY_LABELS[topCategory]} (₹${fmt(categoryTotals[topCategory] ?? 0)})`);
  }

  lines.push(`Late-night orders: ${lateNightCount} detected`);

  // ── Subscriptions section ─────────────────────────────────────────────────
  if (recurring.length > 0) {
    lines.push("");
    lines.push(`─── SUBSCRIPTIONS (${subCount} active, ₹${fmt(subMonthly)}/mo) ──────────────────────`);
    for (const r of recurring.slice(0, 8)) {
      const forgotten = r.isPossiblyForgotten ? " [dormant]" : "";
      lines.push(`• ${r.merchantName} — ₹${fmt(Number(r.averageAmount))} ${r.frequency}${forgotten}`);
    }
  }

  // ── Category breakdown ────────────────────────────────────────────────────
  if (sortedCategories.length > 0) {
    lines.push("");
    lines.push("─── CURRENT MONTH CATEGORIES ───────────────────────────────────────────────");
    for (const [cat, amt] of sortedCategories.slice(0, 8)) {
      const pct = totalSpend > 0 ? Math.round((amt / totalSpend) * 100) : 0;
      lines.push(`• ${CATEGORY_LABELS[cat]}: ₹${fmt(amt)} (${pct}%)`);
    }
  }

  // ── Recent transactions ───────────────────────────────────────────────────
  if (transactions.length > 0) {
    lines.push("");
    lines.push("─── RECENT TRANSACTIONS (last 30) ──────────────────────────────────────────");
    for (const tx of transactions.slice(0, 15)) {
      const date = new Date(tx.date).toISOString().slice(0, 10);
      const label = tx.normalizedMerchant ?? tx.rawDescription ?? "Unknown";
      const arrow = tx.type === "DEBIT" ? "↓" : "↑";
      const cat = CATEGORY_LABELS[tx.category as CategoryName] ?? tx.category;
      lines.push(`${date} ${arrow} ₹${fmt(Number(tx.amount))} — ${label} [${cat}]`);
    }
  }

  // ── Insights ──────────────────────────────────────────────────────────────
  if (insights.length > 0) {
    lines.push("");
    lines.push("─── RECENT INSIGHTS ────────────────────────────────────────────────────────");
    for (const ins of insights) {
      lines.push(`[${ins.severity}] ${ins.title}: ${ins.body}`);
    }
  }

  // ── Z-score anomalies ─────────────────────────────────────────────────────
  if (anomalies.length > 0) {
    lines.push("");
    lines.push("─── SPENDING ANOMALIES (z-score detection, 6-month window) ─────────────────");
    for (const a of anomalies.slice(0, 5)) {
      lines.push(
        `[${a.severity}] ${a.category}: ₹${fmt(a.currentAmount)} vs avg ₹${fmt(a.expectedAmount)} (z=${a.zScore.toFixed(2)})`
      );
    }
  }

  // ── WLS Spend Forecast ────────────────────────────────────────────────────
  if (forecast) {
    lines.push("");
    lines.push("─── NEXT-MONTH SPEND FORECAST (weighted linear regression) ─────────────────");
    lines.push(`Predicted: ₹${fmt(forecast.predictedSpend)}`);
    lines.push(`80% confidence band: ₹${fmt(forecast.lowerBound)} – ₹${fmt(forecast.upperBound)}`);
    lines.push(`Trend: ${forecast.trend} (${forecast.trendPercent > 0 ? "+" : ""}${forecast.trendPercent}%) · Confidence: ${forecast.confidence}`);
  }

  lines.push("");
  lines.push(`─── USER QUERY ─────────────────────────────────────────────────────────────`);
  lines.push(userQuery);

  return lines.join("\n");
}
