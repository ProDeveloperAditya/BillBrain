import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/analytics/dashboard";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { SpendTrendChart, CategoryDonut, WeeklyBarChart } from "@/components/dashboard/Charts";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { InsightCards } from "@/components/dashboard/InsightCards";
import { SubscriptionSummary } from "@/components/dashboard/SubscriptionSummary";
import { UnusualAlertBanner } from "@/components/dashboard/UnusualAlertBanner";

export const metadata = { title: "Dashboard — BillBrain AI" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const data = await getDashboardData(session.user.id);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data.kpi.monthLabel}
            {!data.hasRealData && (
              <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Demo data — import your statements to see real insights
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Unusual alert banner ────────────────────────────────────────────── */}
      {data.unusualAlerts.length > 0 && (
        <UnusualAlertBanner alerts={data.unusualAlerts} />
      )}

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <KpiCards kpi={data.kpi} />

      {/* ── Charts row: trend (2/3) + donut (1/3) ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SpendTrendChart data={data.monthlyTrend} />
        <CategoryDonut data={data.categoryBreakdown} />
      </div>

      {/* ── Weekly pattern + subscription summary ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyBarChart data={data.weeklyPattern} />
        <SubscriptionSummary subscriptions={data.subscriptions} />
      </div>

      {/* ── Recent transactions + AI insights ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTransactions transactions={data.recentTransactions} />
        <InsightCards insights={data.insights} />
      </div>
    </div>
  );
}
