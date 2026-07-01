import { normalizeRaw } from "./merchantNormalizer";
import { categorize } from "./categorize";
import type { ParsedTransaction } from "@/lib/parsers/types";
import type { PreviewRow } from "@/lib/parsers/types";

let idCounter = 0;
function nextId(): string {
  return `pr_${Date.now()}_${++idCounter}`;
}

/** Apply merchant normalization + category tagging to a raw parsed transaction. */
export function normalizeTransaction(tx: ParsedTransaction): PreviewRow {
  const { merchantName } = normalizeRaw(tx.rawDescription);
  const { category } = categorize(merchantName, tx.rawDescription);

  // Confidence-based flagging: low confidence → flagged for user review
  const isFlagged = tx.confidence < 0.6;

  return {
    id: nextId(),
    date: tx.date,
    merchant: merchantName,
    rawDescription: tx.rawDescription,
    amount: tx.amount,
    type: tx.type,
    category,
    isFlagged,
    isDuplicate: false,
  };
}

/** Normalise an entire batch of parsed transactions. */
export function runNormalizationPipeline(transactions: ParsedTransaction[]): PreviewRow[] {
  return transactions.map(normalizeTransaction);
}
