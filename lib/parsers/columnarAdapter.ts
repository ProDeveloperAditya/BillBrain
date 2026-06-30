/**
 * Generic columnar bank-statement parser.
 *
 * Most Indian retail banks (HDFC, ICICI, Axis, Kotak) share the same tabular
 * statement shape — they differ only in date format, header keywords, and
 * column order. This core handles that family; each bank ships a thin adapter
 * that supplies a `ColumnarConfig`.
 *
 * Row shape after whitespace-normalisation:
 *   <date> <description...> [<debit>] [<credit>] <balance>
 *
 * Only one of debit/credit is populated per row (the other column is blank in
 * the source PDF, so it disappears from the extracted text). Direction is
 * therefore inferred from explicit DR/CR markers or narration keywords.
 */

import type { ParsedTransaction } from "./types";

export interface ColumnarConfig {
  /** Global regex that finds every transaction date in the body. Must have one capture group. */
  dateRe: RegExp;
  /** Convert a matched date string to ISO YYYY-MM-DD, or null if invalid. */
  parseDate: (raw: string) => string | null;
  /** Locates the start of the transaction table; parsing begins at the match. */
  headerRe: RegExp;
  /** Confidence score stamped on each parsed row. */
  confidence: number;
}

const MONEY_RE = /[\d,]+\.\d{2}/g;

function num(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function cleanDesc(s: string): string {
  return s
    .replace(/\b\d{9,}\b/g, "")          // drop long ref / cheque numbers
    .replace(/\b(DR|CR|Dr|Cr)\b\s*$/, "") // trailing direction marker
    .replace(/[-|*]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "Transaction";
}

const CREDIT_KEYWORDS =
  /\b(cr)\b|credit|deposit|salary|neft\s*cr|imps\s*cr|refund|received|reversal|interest|cashback|dividend|payout/i;

/**
 * Parse a columnar statement body into transactions.
 */
export function parseColumnar(text: string, cfg: ColumnarConfig): ParsedTransaction[] {
  const norm = text.replace(/\s+/g, " ");

  const headerIdx = norm.search(cfg.headerRe);
  let body = headerIdx >= 0 ? norm.slice(headerIdx) : norm;

  // Drop trailing summary/footer so the last transaction row doesn't absorb a
  // stray "Closing Balance" amount and get mis-typed.
  const footerIdx = body.search(/computer-generated|end of statement|statement summary|closing balance\s*:/i);
  if (footerIdx > 0) body = body.slice(0, footerIdx);

  // Re-anchor the date regex with the global flag so matchAll works regardless
  // of how the caller declared it.
  const dateGlobal = new RegExp(cfg.dateRe.source, "g");
  const dateMatches = [...body.matchAll(dateGlobal)];

  const out: ParsedTransaction[] = [];

  for (let i = 0; i < dateMatches.length; i++) {
    const match = dateMatches[i];
    const start = match.index!;
    const end = dateMatches[i + 1]?.index ?? body.length;
    const chunk = body.slice(start, end).trim();

    const date = cfg.parseDate(match[1] ?? match[0]);
    if (!date) continue;

    const rest = chunk.slice((match[1] ?? match[0]).length).trim();

    const moneyTokens = [...rest.matchAll(MONEY_RE)].map((m) => num(m[0]));
    if (moneyTokens.length < 2) continue;

    const balance = moneyTokens[moneyTokens.length - 1];
    const creditKw = CREDIT_KEYWORDS.test(rest);

    let amount = 0;
    let type: "DEBIT" | "CREDIT";

    if (moneyTokens.length >= 3) {
      // Two amount columns present: ... DEBIT CREDIT BALANCE (one is 0.00).
      const debitCol = moneyTokens[moneyTokens.length - 3];
      const creditCol = moneyTokens[moneyTokens.length - 2];
      if (debitCol > 0 && creditCol === 0) {
        amount = debitCol; type = "DEBIT";
      } else if (creditCol > 0 && debitCol === 0) {
        amount = creditCol; type = "CREDIT";
      } else {
        // Both populated (ambiguous / footer noise) — trust the narration and
        // take the first money token as the transaction amount.
        amount = moneyTokens[0];
        type = creditKw ? "CREDIT" : "DEBIT";
      }
    } else {
      // Single amount column — amount is the first token, direction from narration.
      amount = moneyTokens[0];
      type = creditKw ? "CREDIT" : "DEBIT";
    }

    if (amount <= 0) continue;

    const firstNumIdx = rest.search(MONEY_RE);
    const rawDesc = firstNumIdx > 0 ? rest.slice(0, firstNumIdx) : rest;

    out.push({
      date,
      rawDescription: cleanDesc(rawDesc),
      amount,
      type,
      balance,
      currency: "INR",
      confidence: cfg.confidence,
    });
  }

  return out;
}

// ─── Shared date parsers ────────────────────────────────────────────────────

/** DD-MM-YYYY or DD/MM/YYYY → ISO */
export function parseDmyFull(raw: string): string | null {
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** DD-MM-YY or DD/MM/YY or DD-MM-YYYY → ISO */
export function parseDmyFlexible(raw: string): string | null {
  const m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (!m) return null;
  let y = m[3];
  if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
  return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
