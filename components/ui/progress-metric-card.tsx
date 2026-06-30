"use client";

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SeriesPoint {
  value: number;
  date: string;
}

export interface ProgressMetricCardProps {
  title: string;
  unit?: string;
  data: SeriesPoint[];
  defaultIndex?: number;
  className?: string;
  color?: string;
  prefix?: string;
}

export default function ProgressMetricCard({
  title,
  unit = "",
  data,
  defaultIndex,
  className,
  color = "#6366f1",
  prefix = "",
}: ProgressMetricCardProps) {
  const idx = defaultIndex ?? data.length - 1;
  const current  = data[idx]?.value ?? 0;
  const previous = data[Math.max(0, idx - 1)]?.value ?? current;
  const pctChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isUp = pctChange > 0;
  const isFlat = Math.abs(pctChange) < 0.5;

  const chartData = useMemo(() => data.map((d) => ({ value: d.value })), [data]);

  const formatted = useMemo(
    () =>
      current.toLocaleString("en-IN", {
        maximumFractionDigits: current < 10 ? 1 : 0,
      }),
    [current]
  );

  return (
    <div className={cn("surface-2 border border-border rounded-2xl p-5 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {prefix}{formatted}
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            isFlat
              ? "bg-muted/40 text-muted-foreground"
              : isUp
              ? "bg-red-500/10 text-red-400"
              : "bg-emerald-500/10 text-emerald-400"
          )}
        >
          {isFlat ? (
            <Minus className="h-3 w-3" />
          ) : isUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {Math.abs(pctChange).toFixed(1)}%
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${title})`}
              dot={false}
              activeDot={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0].value as number;
                return (
                  <div className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] shadow-lg">
                    {prefix}{val.toLocaleString("en-IN")} {unit}
                  </div>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data[idx]?.date && (
        <p className="text-[10px] text-muted-foreground">{data[idx].date}</p>
      )}
    </div>
  );
}
