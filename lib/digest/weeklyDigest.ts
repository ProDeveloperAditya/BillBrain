import "server-only";
import { db } from "@/lib/db";
import type { CategoryName } from "@prisma/client";

const CATEGORY_LABELS: Partial<Record<CategoryName, string>> = {
  FOOD_DINING: "Food & Dining", GROCERIES: "Groceries", SUBSCRIPTIONS: "Subscriptions",
  TRANSPORT: "Transport", SHOPPING: "Shopping", COFFEE_CAFES: "Coffee & Cafés",
  ENTERTAINMENT: "Entertainment", UTILITIES: "Utilities", RENT_HOUSING: "Rent & Housing",
};

function fmt(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export interface WeeklyDigest {
  title: string;
  body: string;
  severity: "INFO" | "LOW" | "MEDIUM";
  data: {
    weekSpend: number;
    prevWeekSpend: number;
    changePct: number;
    topCategory: string | null;
    txCount: number;
  };
}

/**
 * Build a weekly spending digest for one user by comparing the last 7 days to
 * the prior 7. Returns null when there's no activity to report.
 */
export async function buildWeeklyDigest(userId: string, now = new Date()): Promise<WeeklyDigest | null> {
  const weekAgo = new Date(now.getTime() - 7 * 864e5);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 864e5);

  const [thisWeek, lastWeek, subs] = await Promise.all([
    db.transaction.findMany({
      where: { userId, type: "DEBIT", isDuplicate: false, date: { gte: weekAgo, lte: now } },
      select: { amount: true, category: true },
    }),
    db.transaction.findMany({
      where: { userId, type: "DEBIT", isDuplicate: false, date: { gte: twoWeeksAgo, lt: weekAgo } },
      select: { amount: true },
    }),
    db.recurringCharge.findMany({
      where: { userId, isCancelled: false },
      select: { averageAmount: true, isPossiblyForgotten: true },
    }),
  ]);

  if (thisWeek.length === 0) return null;

  const weekSpend = thisWeek.reduce((s, t) => s + Number(t.amount), 0);
  const prevWeekSpend = lastWeek.reduce((s, t) => s + Number(t.amount), 0);
  const changePct = prevWeekSpend > 0 ? Math.round(((weekSpend - prevWeekSpend) / prevWeekSpend) * 100) : 0;

  // Top category this week
  const catTotals: Partial<Record<CategoryName, number>> = {};
  for (const t of thisWeek) {
    const c = t.category as CategoryName;
    if (c === "SALARY_INCOME" || c === "TRANSFERS" || c === "INVESTMENTS") continue;
    catTotals[c] = (catTotals[c] ?? 0) + Number(t.amount);
  }
  const topEntry = (Object.entries(catTotals) as [CategoryName, number][]).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topEntry ? (CATEGORY_LABELS[topEntry[0]] ?? topEntry[0]) : null;

  const dormant = subs.filter((s) => s.isPossiblyForgotten).length;

  // Compose body
  const dir = changePct > 0 ? "up" : changePct < 0 ? "down" : "flat";
  const parts: string[] = [];
  parts.push(`You spent **${fmt(weekSpend)}** across ${thisWeek.length} transactions this week`);
  if (prevWeekSpend > 0) parts.push(` — ${dir === "flat" ? "in line with" : `${Math.abs(changePct)}% ${dir} vs`} last week`);
  parts.push(".");
  if (topCategory && topEntry) parts.push(` Top category: **${topCategory}** (${fmt(topEntry[1])}).`);
  if (dormant > 0) parts.push(` You have ${dormant} possibly-forgotten subscription${dormant > 1 ? "s" : ""} worth reviewing.`);

  const severity: WeeklyDigest["severity"] = changePct >= 40 ? "MEDIUM" : changePct >= 15 ? "LOW" : "INFO";

  return {
    title: `Weekly digest — ${fmt(weekSpend)} spent`,
    body: parts.join(""),
    severity,
    data: { weekSpend, prevWeekSpend, changePct, topCategory, txCount: thisWeek.length },
  };
}

/**
 * Generate + persist a fresh WEEKLY_DIGEST insight for a user (replaces the
 * previous week's digest). Returns true if a digest was written.
 */
export async function runWeeklyDigestForUser(userId: string, now = new Date()): Promise<boolean> {
  const digest = await buildWeeklyDigest(userId, now);
  if (!digest) return false;

  // Clear last week's digest so the Insights feed shows only the latest.
  await db.insight.deleteMany({ where: { userId, type: "WEEKLY_DIGEST" } });

  await db.insight.create({
    data: {
      userId,
      type: "WEEKLY_DIGEST",
      severity: digest.severity,
      title: digest.title,
      body: digest.body,
      data: digest.data,
      expiresAt: new Date(now.getTime() + 8 * 864e5),
    },
  });
  return true;
}
