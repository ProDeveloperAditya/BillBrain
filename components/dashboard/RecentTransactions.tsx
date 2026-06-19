"use client";

import { ArrowDownLeft, ArrowUpRight, Copy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecentTx } from "@/lib/analytics/dashboard";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function fmtAmount(amount: number, type: "DEBIT" | "CREDIT") {
  const s = "₹" + amount.toLocaleString("en-IN");
  return type === "CREDIT" ? "+" + s : s;
}

function MerchantIcon({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
      style={{ background: `${color}20`, color }}
    >
      {initials}
    </div>
  );
}

export function RecentTransactions({ transactions }: { transactions: RecentTx[] }) {
  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="divide-y divide-border">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-3/40 transition-colors"
            >
              <MerchantIcon
                name={tx.normalizedMerchant || tx.description}
                color={tx.categoryColor}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {tx.description}
                  </p>
                  {tx.isFlagged && (
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                  )}
                  {tx.isDuplicate && (
                    <Copy className="h-3 w-3 shrink-0 text-destructive" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${tx.categoryColor}18`,
                      color: tx.categoryColor,
                    }}
                  >
                    {tx.categoryDisplayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {fmtDate(tx.date)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {tx.type === "CREDIT" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-[13px] font-semibold tabular-nums",
                    tx.type === "CREDIT" ? "text-emerald-400" : "text-foreground"
                  )}
                >
                  {fmtAmount(tx.amount, tx.type)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
