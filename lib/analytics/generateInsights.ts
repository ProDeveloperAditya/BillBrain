"use server";

import { db } from "@/lib/db";
import type { InsightType, InsightSeverity } from "@prisma/client";
import { detectAnomalies, buildHistories } from "./anomalyDetector";

// ── Constants ──────────────────────────────────────────────────────────────────

const CAT_DISPLAY: Record<string, string> = {
  FOOD_DINING:   "Food & Dining",
  GROCERIES:     "Groceries",
  SUBSCRIPTIONS: "Subscriptions",
  TRANSPORT:     "Transport",
  SHOPPING:      "Shopping",
  HEALTHCARE:    "Healthcare",
  EDUCATION:     "Education",
  SALARY_INCOME: "Salary & Income",
  RENT_HOUSING:  "Rent & Housing",
  UTILITIES:     "Utilities",
  ENTERTAINMENT: "Entertainment",
  COFFEE_CAFES:  "Coffee & Cafés",
  TRAVEL:        "Travel",
  INSURANCE:     "Insurance",
  BANKING_FEES:  "Banking Fees",
  TRANSFERS:     "Transfers",
  INVESTMENTS:   "Investments",
  OTHER:         "Other",
};

// Fixed / income categories excluded from category analysis
const SKIP_CATS = new Set(["SALARY_INCOME", "RENT_HOUSING", "TRANSFERS", "INVESTMENTS"]);

// Insight types that this function owns — stale ones are replaced on each run
const OWNED_TYPES: InsightType[] = [
  "WEEKLY_DIGEST",
  "ANOMALY",
  "SAVINGS_OPPORTUNITY",
  "CATEGORY_SPIKE",
];

const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingInsight {
  type:     InsightType;
  severity: InsightSeverity;
  title:    string;
  body:     string;
  data:     object;
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Generates rule-based insights for a user from the last 90 days of transactions.
 * Replaces any previous auto-generated insights of the same types (except dismissed ones).
 * Safe to call fire-and-forget from import handlers.
 */
export async function generateInsights(userId: string): Promise<void> {
  // Anchor to the most recent month with activity, so a freshly-imported past
  // statement still produces a digest + anomalies (rather than comparing against
  // an empty current month).
  const latestTx = await db.transaction.findFirst({
    where: { userId, isDuplicate: false },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const now = latestTx?.date ?? new Date();

  // 6-month rolling window (enough history for z-score anomaly detection)
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 183);

  // Month boundaries (UTC — matches SpendingSnapshot convention)
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed
  const curMonthStart   = new Date(Date.UTC(y, m,     1));
  const prevMonthStart  = new Date(Date.UTC(y, m - 1, 1));
  const prev2MonthStart = new Date(Date.UTC(y, m - 2, 1));
  const prev3MonthStart = new Date(Date.UTC(y, m - 3, 1));
  const prev4MonthStart = new Date(Date.UTC(y, m - 4, 1));
  const prev5MonthStart = new Date(Date.UTC(y, m - 5, 1));
  const nextMonthStart  = new Date(Date.UTC(y, m + 1, 1));

  const [transactions, subscriptions] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        type:        "DEBIT",
        isDuplicate: false,
        date:        { gte: windowStart },
      },
      select: {
        date:               true,
        amount:             true,
        category:           true,
        normalizedMerchant: true,
        description:        true,
      },
    }),
    db.recurringCharge.findMany({
      where: { userId, isCancelled: false },
      select: {
        merchantName:        true,
        averageAmount:       true,
        annualCost:          true,
        isPossiblyForgotten: true,
      },
    }),
  ]);

  if (transactions.length === 0) return;

  // ── Partition into monthly buckets ────────────────────────────────────────

  const curTxs   = transactions.filter((t) => t.date >= curMonthStart   && t.date < nextMonthStart);
  const prevTxs  = transactions.filter((t) => t.date >= prevMonthStart  && t.date < curMonthStart);
  const prev2Txs = transactions.filter((t) => t.date >= prev2MonthStart && t.date < prevMonthStart);
  const prev3Txs = transactions.filter((t) => t.date >= prev3MonthStart && t.date < prev2MonthStart);
  const prev4Txs = transactions.filter((t) => t.date >= prev4MonthStart && t.date < prev3MonthStart);
  const prev5Txs = transactions.filter((t) => t.date >= prev5MonthStart && t.date < prev4MonthStart);

  // Aggregate spend by category (skip fixed/income)
  const catSum = (txs: typeof transactions): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const t of txs) {
      if (SKIP_CATS.has(t.category)) continue;
      out[t.category] = (out[t.category] ?? 0) + Number(t.amount);
    }
    return out;
  };

  const curCats   = catSum(curTxs);
  const prevCats  = catSum(prevTxs);
  const prev2Cats = catSum(prev2Txs);
  const prev3Cats = catSum(prev3Txs);
  const prev4Cats = catSum(prev4Txs);
  const prev5Cats = catSum(prev5Txs);

  const topEntry = (cats: Record<string, number>) =>
    Object.entries(cats).sort((a, b) => b[1] - a[1])[0] ?? null;

  const pending: PendingInsight[] = [];

  // ── (a) Top spending category: this month vs last ─────────────────────────

  const topCur  = topEntry(curCats);
  const topPrev = topEntry(prevCats);

  if (topCur) {
    const [curCat, curAmt] = topCur;
    const prevAmt    = prevCats[curCat] ?? 0;
    const prevTopCat = topPrev?.[0];
    const prevTopAmt = topPrev?.[1] ?? 0;

    const curName  = CAT_DISPLAY[curCat]     ?? curCat;
    const prevName = prevTopCat ? (CAT_DISPLAY[prevTopCat] ?? prevTopCat) : null;

    const categoryShifted = Boolean(prevTopCat && prevTopCat !== curCat);
    const changePct = prevAmt > 0 ? Math.round(((curAmt - prevAmt) / prevAmt) * 100) : 0;

    let title: string;
    let body: string;
    let severity: InsightSeverity;

    if (categoryShifted) {
      title    = `Top spend shifted from ${prevName} to ${curName}`;
      body     = `Last month ${prevName} was your biggest category (${fmt(prevTopAmt)}). This month ${curName} leads at ${fmt(curAmt)}.`;
      severity = "MEDIUM";
    } else if (prevAmt > 0 && changePct >= 20) {
      title    = `${curName} up ${changePct}% from last month`;
      body     = `Your top category, ${curName}, rose from ${fmt(prevAmt)} last month to ${fmt(curAmt)} this month — a ${changePct}% increase.`;
      severity = changePct >= 50 ? "HIGH" : "MEDIUM";
    } else {
      title    = `${curName} is your top spending category this month`;
      body     = `You've spent ${fmt(curAmt)} on ${curName} so far this month${prevAmt > 0 ? `, vs ${fmt(prevAmt)} last month` : ""}.`;
      severity = "INFO";
    }

    pending.push({
      type: "WEEKLY_DIGEST",
      severity,
      title,
      body,
      data: {
        autoGenerated:   true,
        currentCategory: curCat,
        currentAmount:   curAmt,
        prevCategory:    prevTopCat ?? null,
        prevAmount:      prevAmt,
        changePercent:   changePct,
      },
    });
  }

  // ── (b) Highest single merchant (90-day window) ───────────────────────────

  const merchantMap: Record<string, { total: number; count: number }> = {};
  for (const t of transactions) {
    const key = t.normalizedMerchant;
    if (!key || SKIP_CATS.has(t.category)) continue;
    merchantMap[key] = merchantMap[key] ?? { total: 0, count: 0 };
    merchantMap[key].total += Number(t.amount);
    merchantMap[key].count++;
  }

  const topMerchant = Object.entries(merchantMap).sort((a, b) => b[1].total - a[1].total)[0];

  if (topMerchant) {
    const [name, { total, count }] = topMerchant;
    pending.push({
      type:     "ANOMALY",
      severity: "MEDIUM",
      title:    `${name} is your highest-spend merchant`,
      body:     `You've spent ${fmt(total)} at ${name} across ${count} transaction${count === 1 ? "" : "s"} in the last 90 days — more than any other merchant.`,
      data:     {
        autoGenerated:    true,
        merchantName:     name,
        totalSpend:       Math.round(total),
        transactionCount: count,
        periodDays:       90,
      },
    });
  }

  // ── (c) Estimated annual subscription cost ────────────────────────────────

  if (subscriptions.length > 0) {
    const monthly = subscriptions.reduce((s, r) => s + Number(r.averageAmount), 0);
    const annual  = subscriptions.reduce((s, r) => s + Number(r.annualCost),   0);
    const dormant = subscriptions.filter((r) => r.isPossiblyForgotten).length;

    const dormantNote = dormant > 0
      ? ` ${dormant} of ${dormant === 1 ? "it is" : "them are"} possibly unused — cancelling could save ${fmt(dormant * (monthly / subscriptions.length) * 12)}/year.`
      : "";

    pending.push({
      type:     "SAVINGS_OPPORTUNITY",
      severity: monthly > 2000 ? "HIGH" : "MEDIUM",
      title:    `Subscriptions cost ${fmt(monthly)}/month — ${fmt(annual)}/year`,
      body:     `You have ${subscriptions.length} active subscription${subscriptions.length === 1 ? "" : "s"} totalling ${fmt(monthly)}/month (${fmt(annual)}/year).${dormantNote}`,
      data:     {
        autoGenerated:     true,
        subscriptionCount: subscriptions.length,
        monthlyTotal:      Math.round(monthly),
        annualTotal:       Math.round(annual),
        dormantCount:      dormant,
      },
    });
  }

  // ── (d) Z-score anomaly detection (6-month rolling window) ──────────────

  {
    // Build per-category monthly history: [p5, p4, p3, p2, p1, current]
    const allCats = new Set([
      ...Object.keys(curCats),
      ...Object.keys(prevCats),
      ...Object.keys(prev2Cats),
      ...Object.keys(prev3Cats),
      ...Object.keys(prev4Cats),
      ...Object.keys(prev5Cats),
    ]);

    const spendByCategory: Record<string, number[]> = {};
    for (const cat of allCats) {
      if (SKIP_CATS.has(cat)) continue;
      spendByCategory[cat] = [
        prev5Cats[cat] ?? 0,
        prev4Cats[cat] ?? 0,
        prev3Cats[cat] ?? 0,
        prev2Cats[cat] ?? 0,
        prevCats[cat]  ?? 0,
        curCats[cat]   ?? 0,
      ];
    }

    const anomalies = detectAnomalies(buildHistories(spendByCategory));

    for (const a of anomalies.slice(0, 3)) { // cap at 3 anomaly insights
      const catName = CAT_DISPLAY[a.category] ?? a.category;
      pending.push({
        type:     "CATEGORY_SPIKE",
        severity: a.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
        title:    `${catName} is ${a.percentAboveNorm}% above normal (z = ${a.zScore})`,
        body:     `You've spent ${fmt(a.currentAmount)} on ${catName} this month — ${fmt(a.currentAmount - a.expectedAmount)} more than your typical ${fmt(a.expectedAmount)}/month. This is a ${a.severity.toLowerCase()} statistical anomaly.`,
        data:     {
          autoGenerated:   true,
          category:        a.category,
          currentAmount:   a.currentAmount,
          expectedAmount:  a.expectedAmount,
          stdDev:          a.stdDev,
          zScore:          a.zScore,
          severity:        a.severity,
          percentAboveNorm: a.percentAboveNorm,
        },
      });
    }
  }

  if (pending.length === 0) return;

  // ── Persist: replace stale auto-generated insights, keep dismissed ones ───

  const typesToReplace = [...new Set(pending.map((p) => p.type))];

  await db.insight.deleteMany({
    where: {
      userId,
      type:        { in: typesToReplace },
      isDismissed: false,
    },
  });

  await db.insight.createMany({
    data: pending.map((p) => ({
      userId,
      type:        p.type,
      severity:    p.severity,
      title:       p.title,
      body:        p.body,
      data:        p.data,
      isRead:      false,
      isDismissed: false,
      generatedAt: new Date(),
    })),
  });
}
