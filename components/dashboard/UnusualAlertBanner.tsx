"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UnusualAlert } from "@/lib/analytics/dashboard";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function UnusualAlertBanner({ alerts }: { alerts: UnusualAlert[] }) {
  const [dismissed, setDismissed] = useState(false);

  if (alerts.length === 0 || dismissed) return null;

  const primary = alerts[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-3 flex items-start gap-3"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 mt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {alerts.length} unusual charge{alerts.length > 1 ? "s" : ""} this month
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            <span className="text-foreground font-medium">{primary.description}</span>
            {" — "}₹{primary.amount.toLocaleString("en-IN")} on {fmtDate(primary.date)}
            {" in "}
            <span style={{ color: primary.categoryDisplayName ? undefined : "#94a3b8" }}>
              {primary.categoryDisplayName}
            </span>
            {alerts.length > 1 && (
              <span className="text-muted-foreground">
                {" "}and {alerts.length - 1} more
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 mt-0.5 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
