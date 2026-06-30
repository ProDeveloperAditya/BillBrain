"use client";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrendPoint, CategoryPoint, WeeklyPoint } from "@/lib/analytics/dashboard";

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "oklch(0.145 0.017 282)",
  border: "1px solid oklch(1 0 0 / 10%)",
  borderRadius: "10px",
  padding: "10px 14px",
  fontSize: "12px",
  color: "oklch(0.93 0.008 255)",
  boxShadow: "0 8px 32px oklch(0 0 0 / 40%)",
};

function fmt(v: number) {
  return "₹" + v.toLocaleString("en-IN");
}

// ─── Monthly Spend Trend (area + line) ───────────────────────────────────────

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export function SpendTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card className="surface-2 border-border lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Monthly Spend Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRecurring" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(1 0 0 / 6%)"
              vertical={false}
            />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: "oklch(0.52 0.015 255)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.52 0.015 255)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="totalSpend"
              name="Total Spend"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#gradSpend)"
              dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="recurringTotal"
              name="Recurring"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#gradRecurring)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Category donut ───────────────────────────────────────────────────────────


function fmtK(v: number): string {
  if (v >= 100000) return "₹" + (v / 100000).toFixed(1) + "L";
  if (v >= 1000)   return "₹" + (v / 1000).toFixed(0) + "k";
  return "₹" + Math.round(v);
}

export function CategoryDonut({ data }: { data: CategoryPoint[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return null;

  // Merge OTHER → "Uncategorised" with a slate colour
  const display = data.map((d) =>
    d.category === "OTHER"
      ? { ...d, displayName: "Uncategorised", color: "#475569" }
      : d
  );

  const sorted = [...display].sort((a, b) => b.amount - a.amount);
  const top    = sorted.slice(0, 6); // cap at 6 rows so card doesn't overflow

  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Total spend: {fmtK(total)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {top.map((d) => {
            const pct = Math.round((d.amount / total) * 100);
            return (
              <div key={d.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: d.color }}
                    />
                    <span className="text-[12px] text-foreground truncate">{d.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[12px] font-semibold text-foreground">{fmtK(d.amount)}</span>
                    <span className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: d.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-primary mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export function WeeklyBarChart({ data }: { data: WeeklyPoint[] }) {
  const max = Math.max(...data.map((d) => d.amount));

  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Weekly Spending Pattern</CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">This month by day</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={24}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(1 0 0 / 6%)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "oklch(0.52 0.015 255)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "oklch(0.52 0.015 255)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={entry.amount === max ? "#a855f7" : "oklch(0.605 0.205 278 / 45%)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
