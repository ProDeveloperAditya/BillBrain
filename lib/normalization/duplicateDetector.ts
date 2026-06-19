import { db as prisma } from "@/lib/db";
import type { PreviewRow } from "@/lib/parsers/types";

/**
 * For each row in `batch`, check if an identical transaction (same userId,
 * normalised merchant, amount, type, and date ±1 day) already exists in DB.
 * Also flags within-batch duplicates (same merchant + amount + date).
 *
 * Returns the same rows with `isDuplicate` set.
 */
export async function detectDuplicates(rows: PreviewRow[], userId: string): Promise<PreviewRow[]> {
  if (rows.length === 0) return rows;

  // ── 1. Within-batch dedup ──────────────────────────────────────────────────
  const batchKeys = new Map<string, number>(); // key → first-seen index
  const batchDupes = new Set<string>();

  for (const row of rows) {
    const key = `${row.merchant.toLowerCase()}|${row.amount}|${row.date}|${row.type}`;
    if (batchKeys.has(key)) batchDupes.add(key);
    else batchKeys.set(key, 1);
  }

  // ── 2. DB dedup ────────────────────────────────────────────────────────────
  // Build date ranges to query (date ± 1 day per row)
  const dates = rows.map((r) => r.date).filter(Boolean);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const dbMin = new Date(minDate);
  dbMin.setDate(dbMin.getDate() - 1);
  const dbMax = new Date(maxDate);
  dbMax.setDate(dbMax.getDate() + 1);

  const existing = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: dbMin, lte: dbMax },
    },
    select: {
      normalizedMerchant: true,
      amount: true,
      type: true,
      date: true,
    },
  });

  const dbKeySet = new Set(
    existing.map((tx: { normalizedMerchant: string | null; amount: { toNumber?: () => number } | number; type: string; date: Date }) => {
      const dateStr = tx.date.toISOString().slice(0, 10);
      const amt = typeof tx.amount === "object" && tx.amount !== null && typeof (tx.amount as { toNumber?: () => number }).toNumber === "function"
        ? (tx.amount as { toNumber: () => number }).toNumber()
        : Number(tx.amount);
      return `${(tx.normalizedMerchant ?? "").toLowerCase()}|${amt}|${dateStr}|${tx.type}`;
    })
  );

  // ── 3. Mark duplicates ─────────────────────────────────────────────────────
  const seenInBatch = new Set<string>();

  return rows.map((row) => {
    const key = `${row.merchant.toLowerCase()}|${row.amount}|${row.date}|${row.type}`;

    const inBatch = seenInBatch.has(key);
    seenInBatch.add(key);

    const inDb = dbKeySet.has(key);

    return { ...row, isDuplicate: inBatch || inDb };
  });
}
