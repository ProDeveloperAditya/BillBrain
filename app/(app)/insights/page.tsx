import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { InsightsClient } from "@/components/insights/InsightsClient";
import type { InsightRow, DigestStats } from "@/components/insights/InsightsClient";

export const metadata = { title: "Insights — BillBrain AI" };

// ── Demo fallback ─────────────────────────────────────────────────────────────

const DEMO_INSIGHTS: InsightRow[] = [
  {
    id: "demo-1",
    type: "LEAK",
    severity: "HIGH",
    title: "Late-night delivery surge",
    body: "Your late-night food delivery spend is 34% above last month — ₹2,140 between 11 pm–2 am. Setting a nightly cutoff could save ~₹800/month.",
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-2",
    type: "SUBSCRIPTION_ALERT",
    severity: "MEDIUM",
    title: "3 entertainment subscriptions overlap",
    body: "Netflix, Prime Video, and Hotstar are all active simultaneously, totalling ₹899/month. Consider pausing one while you're watching another.",
    generatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-3",
    type: "SAVINGS_OPPORTUNITY",
    severity: "LOW",
    title: "Convenience spend habit forming",
    body: "Small convenience purchases (₹200–₹500) made 23 times this month. Extrapolated annually that's ₹14,000+. Batching errands weekly could help.",
    generatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "demo-4",
    type: "ANOMALY",
    severity: "HIGH",
    title: "Unusual ₹4,200 charge from Zomato",
    body: "A single Zomato transaction of ₹4,200 on 18 Apr is 8× your average order. Verify this isn't a duplicate or accidental bulk order.",
    generatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "demo-5",
    type: "WEEKLY_DIGEST",
    severity: "INFO",
    title: "This week's financial digest",
    body: "You spent ₹8,320 this week. Top categories: Food & Dining (42%), Shopping (28%), Transport (18%). Overall 12% below your monthly average pace.",
    generatedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
];

const DEMO_STATS: DigestStats = {
  totalSpendThisMonth: 32400,
  highInsightCount: 2,
  topCategory: "FOOD_DINING",
  topCategorySpend: 8100,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const userId = session.user.id;

  // Check for real data
  const txCount = await db.transaction.count({ where: { userId, isDuplicate: false } });
  const hasRealData = txCount > 0;

  if (!hasRealData) {
    return (
      <InsightsClient
        insights={DEMO_INSIGHTS}
        digestStats={DEMO_STATS}
        hasRealData={false}
      />
    );
  }

  // Fetch non-dismissed insights ordered newest first
  const rawInsights = await db.insight.findMany({
    where: { userId, isDismissed: false },
    orderBy: { generatedAt: "desc" },
    take: 50,
  });

  const insights: InsightRow[] = rawInsights.map((ins) => ({
    id:          ins.id,
    type:        ins.type,
    severity:    ins.severity,
    title:       ins.title,
    body:        ins.body,
    generatedAt: ins.generatedAt.toISOString(),
  }));

  // Digest stats: current calendar month
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [monthTxns, highCount] = await Promise.all([
    db.transaction.findMany({
      where: {
        userId,
        isDuplicate: false,
        type: "DEBIT",
        date: { gte: start, lte: end },
      },
      select: { amount: true, category: true },
    }),
    db.insight.count({ where: { userId, isDismissed: false, severity: "HIGH" } }),
  ]);

  const totalSpendThisMonth = monthTxns.reduce((s, t) => s + Number(t.amount), 0);

  // Top category by spend
  const catMap: Record<string, number> = {};
  for (const t of monthTxns) {
    catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.amount);
  }
  const topCategory = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a])[0] ?? null;
  const topCategorySpend = topCategory ? catMap[topCategory] : 0;

  const digestStats: DigestStats = {
    totalSpendThisMonth,
    highInsightCount: highCount,
    topCategory,
    topCategorySpend,
  };

  return (
    <InsightsClient insights={insights} digestStats={digestStats} hasRealData />
  );
}
