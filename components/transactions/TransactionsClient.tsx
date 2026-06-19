"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight, RefreshCcw, Calendar,
  Receipt, Tag, FileText, Repeat2, AlertTriangle, X, SlidersHorizontal,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Category metadata ─────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  FOOD_DINING: "Food & Dining", GROCERIES: "Groceries", SUBSCRIPTIONS: "Subscriptions",
  TRANSPORT: "Transport", SHOPPING: "Shopping", HEALTHCARE: "Healthcare",
  EDUCATION: "Education", SALARY_INCOME: "Salary/Income", RENT_HOUSING: "Rent & Housing",
  UTILITIES: "Utilities", ENTERTAINMENT: "Entertainment", COFFEE_CAFES: "Coffee & Cafés",
  TRAVEL: "Travel", INSURANCE: "Insurance", BANKING_FEES: "Banking Fees",
  TRANSFERS: "Transfers", INVESTMENTS: "Investments", OTHER: "Other",
};

const CAT_COLOR: Record<string, string> = {
  FOOD_DINING: "#f97316", GROCERIES: "#22c55e", SUBSCRIPTIONS: "#a855f7",
  TRANSPORT: "#3b82f6", SHOPPING: "#ec4899", HEALTHCARE: "#14b8a6",
  EDUCATION: "#6366f1", SALARY_INCOME: "#10b981", RENT_HOUSING: "#64748b",
  UTILITIES: "#eab308", ENTERTAINMENT: "#f43f5e", COFFEE_CAFES: "#f59e0b",
  TRAVEL: "#06b6d4", INSURANCE: "#94a3b8", BANKING_FEES: "#ef4444",
  TRANSFERS: "#7c3aed", INVESTMENTS: "#10b981", OTHER: "#64748b",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TxRow {
  id: string;
  date: string;
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string;
  normalizedMerchant: string | null;
  rawDescription: string | null;
  isRecurring: boolean;
  isFlagged: boolean;
  isDuplicate: boolean;
  tags: string[];
  confidence: number;
  currency: string;
  sourceFileName: string | null;
}

export interface TxFilters {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
  recurring?: boolean;
  flagged?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function buildUrl(filters: TxFilters, page: number): string {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.category) p.set("category", filters.category);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.recurring) p.set("recurring", "1");
  if (filters.flagged) p.set("flagged", "1");
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return `/transactions${qs ? `?${qs}` : ""}`;
}

// ── Badge atoms ───────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const color = CAT_COLOR[category] ?? "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: `${color}18`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      {CAT_LABEL[category] ?? category}
    </span>
  );
}

function TypeTag({ type }: { type: "DEBIT" | "CREDIT" }) {
  return (
    <span className={cn(
      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
      type === "DEBIT"
        ? "bg-destructive/12 text-destructive"
        : "bg-emerald-500/12 text-emerald-400"
    )}>
      {type}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <tr>
      <td colSpan={6}>
        <div className="py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Receipt className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">
            {hasFilters ? "No matching transactions" : "No transactions yet"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
            {hasFilters
              ? "Try adjusting your filters or clearing the search."
              : "Import your bank statements to get started."}
          </p>
        </div>
      </td>
    </tr>
  );
}

// ── Transaction drawer ────────────────────────────────────────────────────────

function TxDrawer({ tx, onClose }: { tx: TxRow | null; onClose: () => void }) {
  if (!tx) return null;

  const color = tx.type === "CREDIT" ? "#10b981" : undefined;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin">
      <SheetHeader className="border-b border-border pb-4">
        <SheetTitle className="text-[15px]">
          {tx.normalizedMerchant ?? tx.rawDescription ?? "Transaction"}
        </SheetTitle>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TypeTag type={tx.type} />
          <CategoryBadge category={tx.category} />
          {tx.isRecurring && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/12 text-violet-400">
              Recurring
            </span>
          )}
          {tx.isFlagged && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 text-amber-400">
              Flagged
            </span>
          )}
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        {/* Amount */}
        <div className="text-center py-4 surface-1 rounded-xl">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
            {tx.type === "CREDIT" ? "Received" : "Spent"}
          </p>
          <p className="text-4xl font-bold tabular-nums" style={{ color }}>
            {tx.type === "CREDIT" ? "+" : ""}₹{fmt(tx.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{tx.currency}</p>
        </div>

        {/* Details grid */}
        {[
          { icon: Calendar, label: "Date", value: fmtDate(tx.date) },
          { icon: Tag, label: "Category", value: CAT_LABEL[tx.category] ?? tx.category },
          { icon: Receipt, label: "Merchant", value: tx.normalizedMerchant ?? "—" },
          { icon: FileText, label: "Raw description", value: tx.rawDescription ?? "—" },
          { icon: FileText, label: "Source file", value: tx.sourceFileName ?? "—" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
              <p className="text-[13px] text-foreground mt-0.5 break-words">{value}</p>
            </div>
          </div>
        ))}

        {/* Tags */}
        {tx.tags.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Tags</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tx.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/70 text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confidence */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            Parser confidence:{" "}
            <span className={cn("font-medium", tx.confidence < 0.6 ? "text-amber-400" : "text-emerald-400")}>
              {Math.round(tx.confidence * 100)}%
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  searchValue,
  setSearchValue,
  onUpdate,
  isPending,
}: {
  filters: TxFilters;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onUpdate: (updates: Partial<TxFilters>) => void;
  isPending: boolean;
}) {
  const hasFilters = !!(filters.category || filters.from || filters.to || filters.recurring || filters.flagged || filters.q);

  return (
    <div className="flex flex-col gap-2">
      {/* Search + filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search merchant…"
            className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Category */}
        <Select
          value={filters.category ?? "ALL"}
          onValueChange={(v) => onUpdate({ category: v === "ALL" ? undefined : (v ?? undefined) })}
        >
          <SelectTrigger size="sm" className="min-w-[140px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {Object.entries(CAT_LABEL).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => onUpdate({ from: e.target.value || undefined })}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          title="From date"
        />

        {/* Date to */}
        <input
          type="date"
          value={filters.to ?? ""}
          onChange={(e) => onUpdate({ to: e.target.value || undefined })}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          title="To date"
        />

        {/* Toggle buttons */}
        <button
          onClick={() => onUpdate({ recurring: !filters.recurring })}
          className={cn(
            "h-8 px-3 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap",
            filters.recurring
              ? "border-violet-400/40 bg-violet-500/10 text-violet-400"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Repeat2 className="h-3.5 w-3.5" />
          Recurring
        </button>

        <button
          onClick={() => onUpdate({ flagged: !filters.flagged })}
          className={cn(
            "h-8 px-3 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap",
            filters.flagged
              ? "border-amber-400/40 bg-amber-500/10 text-amber-400"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Suspicious
        </button>

        {/* Clear all */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate({ category: undefined, from: undefined, to: undefined, recurring: undefined, flagged: undefined })}
            className="h-8 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        {/* Loading indicator */}
        {isPending && (
          <RefreshCcw className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
        )}
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page, total, pageSize, onPage,
}: {
  page: number; total: number; pageSize: number; onPage: (n: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-[12px] text-muted-foreground px-1">
      <span>{total === 0 ? "0 results" : `${from}–${to} of ${total}`}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="px-2">{page} / {totalPages}</span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            className="h-7 w-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

export function TransactionsClient({
  transactions,
  total,
  page,
  pageSize,
  filters,
}: {
  transactions: TxRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: TxFilters;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(filters.q ?? "");

  const selectedTx = transactions.find((t) => t.id === selectedId) ?? null;

  // Debounced search → URL update
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== (filters.q ?? "")) {
        const newFilters = { ...filters, q: searchValue || undefined };
        startTransition(() => router.push(buildUrl(newFilters, 1)));
      }
    }, 380);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const handleUpdate = useCallback(
    (updates: Partial<TxFilters>) => {
      const newFilters = { ...filters, ...updates };
      startTransition(() => router.push(buildUrl(newFilters, 1)));
    },
    [filters, router]
  );

  const handlePage = useCallback(
    (n: number) => {
      startTransition(() => router.push(buildUrl(filters, n)));
    },
    [filters, router]
  );

  const hasFilters = !!(filters.category || filters.from || filters.to || filters.recurring || filters.flagged || filters.q);

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} transaction${total !== 1 ? "s" : ""}` : "No transactions imported yet"}
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onUpdate={handleUpdate}
          isPending={isPending}
        />

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "surface-2 border border-border rounded-2xl overflow-hidden transition-opacity",
            isPending && "opacity-60"
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Date", "Merchant", "Amount", "Category", "Type", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <EmptyState hasFilters={hasFilters} />
                ) : (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedId(tx.id)}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                        {tx.normalizedMerchant ?? tx.rawDescription ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        <span className={tx.type === "CREDIT" ? "text-emerald-400" : "text-foreground"}>
                          {tx.type === "CREDIT" ? "+" : ""}₹{fmt(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryBadge category={tx.category} />
                      </td>
                      <td className="px-4 py-3">
                        <TypeTag type={tx.type} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {tx.isRecurring && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/12 text-violet-400">
                              Recurring
                            </span>
                          )}
                          {tx.isFlagged && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 text-amber-400">
                              Flagged
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        <Pagination page={page} total={total} pageSize={pageSize} onPage={handlePage} />
      </div>

      {/* Drawer */}
      <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 flex flex-col">
          {selectedTx && <TxDrawer tx={selectedTx} onClose={() => setSelectedId(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
