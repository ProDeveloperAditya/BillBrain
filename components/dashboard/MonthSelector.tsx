"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function label(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTHS[(mo ?? 1) - 1]} ${y}`;
}

export function MonthSelector({
  availableMonths,
  selectedMonth,
}: {
  availableMonths: string[];
  selectedMonth: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!selectedMonth || availableMonths.length === 0) return null;

  // availableMonths is newest-first; index 0 is the most recent month.
  const idx = availableMonths.indexOf(selectedMonth);
  const newer = idx > 0 ? availableMonths[idx - 1] : null;            // forward in time
  const older = idx < availableMonths.length - 1 ? availableMonths[idx + 1] : null; // back in time

  function go(m: string | null) {
    if (!m) return;
    setOpen(false);
    router.push(`/dashboard?month=${m}`);
  }

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer";

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button onClick={() => go(older)} disabled={!older} aria-label="Previous month" className={btn}>
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 h-8 text-sm font-medium text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        {label(selectedMonth)}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <button onClick={() => go(newer)} disabled={!newer} aria-label="Next month" className={btn}>
        <ChevronRight className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-44 overflow-y-auto scrollbar-thin rounded-lg bg-popover p-1 shadow-lg ring-1 ring-foreground/10">
          {availableMonths.map((m) => (
            <button
              key={m}
              onClick={() => go(m)}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-1.5 text-sm transition-colors cursor-pointer",
                m === selectedMonth
                  ? "bg-primary/12 text-primary font-medium"
                  : "text-foreground hover:bg-surface-3"
              )}
            >
              {label(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
