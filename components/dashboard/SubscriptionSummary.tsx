"use client";

import { Repeat2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionItem } from "@/lib/analytics/dashboard";

export function SubscriptionSummary({
  subscriptions,
}: {
  subscriptions: SubscriptionItem[];
}) {
  const monthlyTotal = subscriptions.reduce((s, r) => s + r.averageAmount, 0);
  const annualTotal  = subscriptions.reduce((s, r) => s + r.annualCost, 0);
  const forgotten    = subscriptions.filter((r) => r.isPossiblyForgotten);

  return (
    <Card className="surface-2 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Subscriptions</CardTitle>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">
              ₹{monthlyTotal.toLocaleString("en-IN")}
              <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              ₹{(annualTotal / 1000).toFixed(0)}k/year
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-1">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-surface-3/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Repeat2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">
                  {sub.merchantName}
                </p>
                {sub.isPossiblyForgotten && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-0.5 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Possibly forgotten
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {sub.isPossiblyForgotten && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 border-amber-400/40 text-amber-400"
                >
                  Review
                </Badge>
              )}
              <span className="text-[13px] font-semibold tabular-nums">
                ₹{sub.averageAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        ))}

        {forgotten.length > 0 && (
          <div className="mt-2 rounded-lg bg-amber-400/8 border border-amber-400/20 p-2.5">
            <p className="text-[11px] text-amber-400 font-medium">
              {forgotten.length} subscription{forgotten.length > 1 ? "s" : ""} may be forgotten
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Cancelling them saves ₹
              {forgotten
                .reduce((s, r) => s + r.annualCost, 0)
                .toLocaleString("en-IN")}
              /year
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
