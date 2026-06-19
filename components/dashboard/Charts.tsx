"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
  Legend,
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

interface DonutLabelProps {
  cx: number;
  cy: number;
  totalSpend: number;
}

function DonutCenterLabel({ cx, cy, totalSpend }: DonutLabelProps) {
  return (
    <>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fill: "oklch(0.52 0.015 255)", fontSize: "10px" }}
      >
        Total
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: "oklch(0.93 0.008 255)",
          fontSize: "13px",
          fontWeight: 700,
        }}
      >
        ₹{(totalSpend / 1000).toFixed(0)}k
      </text>
    </>
  );
}

function CatTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: CategoryPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={TOOLTIP_STYLE}>
      <p className="font-semibold" style={{ color: d.payload.color }}>
        {d.payload.displayName}
      </p>
      <p className="mt-0.5">{fmt(d.value)}</p>
      <p style={{ color: "oklch(0.52 0.015 255)" }}>{d.payload.percentage}% of total</p>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategoryPoint[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              dataKey="amount"
              nameKey="displayName"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={entry.color}
                  opacity={0.9}
                  stroke="transparent"
                />
              ))}
              {/* Center label rendered via label prop — use a custom component trick */}
            </Pie>
            <Tooltip content={<CatTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center total overlay (positioned over the chart) */}
        <div className="relative -mt-[140px] flex flex-col items-center justify-center h-[56px] pointer-events-none">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-base font-bold">₹{(total / 1000).toFixed(0)}k</p>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {data.map((d) => (
            <div key={d.category} className="flex items-center gap-1.5 min-w-0">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: d.color }}
              />
              <span className="truncate text-[11px] text-muted-foreground">
                {d.displayName}
              </span>
              <span className="ml-auto shrink-0 text-[11px] font-medium">
                {d.percentage}%
              </span>
            </div>
          ))}
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
