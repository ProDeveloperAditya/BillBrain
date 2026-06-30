/**
 * SBI YONO statement parser.
 *
 * Typical SBI statement layout (text layer, merged pages):
 *   … Credit Debit Balance …
 *   01 Jan 25  UPI/DR/12345/Zomato/HDFC/zomato@hdfcbank/Food  -  520.00  48,230.50
 *   03 Jan 25  NEFT INB …                                       -  5000.00 43,230.50
 *
 * Dates: "DD Mon YY" or "DD/MM/YYYY" or "DD-MM-YYYY"
 * Amounts: three-column (Credit  Debit  Balance) or fallback two-column (Amount  Balance)
 */

import type { ParsedTransaction } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  const s = raw.trim();

  const dMonY = s.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3})[\s\-/](\d{2,4})$/);
  if (dMonY) {
    const m = MONTH_MAP[dMonY[2].toLowerCase()];
    if (m) {
      let y = dMonY[3];
      if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
      return `${y}-${m}-${dMonY[1].padStart(2, "0")}`;
    }
  }

  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const nd = new Date(s);
  return isNaN(nd.getTime()) ? null : nd.toISOString().slice(0, 10);
}

function num(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function cleanDesc(s: string): string {
  return s.replace(/[-|*]+\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 90) || "Transaction";
}

const DATE_RE = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[\s\-/][A-Za-z]{3}[\s\-/]\d{2,4})/;
// Credit  Debit  Balance (one of first two is 0 / "-")
const TRIPLE  = /([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+\.\d{2})/;
// Amount  Balance
const PAIR    = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;

function parseChunk(chunk: string): ParsedTransaction | null {
  const dm = chunk.match(DATE_RE);
  if (!dm) return null;
  const date = parseDate(dm[1]);
  if (!date) return null;
  const rest = chunk.slice(dm[0].length);

  const tm = rest.match(TRIPLE);
  if (tm) {
    const credit = num(tm[1]);
    const debit  = num(tm[2]);
    const amount = debit > 0 ? debit : credit;
    if (amount > 0) {
      return {
        date,
        rawDescription: cleanDesc(rest.slice(0, tm.index)),
        amount,
        type:       debit > 0 ? "DEBIT" : "CREDIT",
        balance:    num(tm[3]),
        currency:   "INR",
        confidence: 0.9,
      };
    }
  }

  const pm = rest.match(PAIR);
  if (pm) {
    const amount = num(pm[1]);
    if (amount > 0) {
      const drCr = rest.match(/\b(DR|CR|Dr|Cr)\b/);
      const type: "DEBIT" | "CREDIT" =
        drCr
          ? /cr/i.test(drCr[1]) ? "CREDIT" : "DEBIT"
          : /credit|deposit|received|refund/i.test(rest) ? "CREDIT" : "DEBIT";
      return {
        date,
        rawDescription: cleanDesc(rest.slice(0, pm.index)),
        amount,
        type,
        balance:    num(pm[2]),
        currency:   "INR",
        confidence: 0.65,
      };
    }
  }

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse SBI YONO statement body text into transactions.
 * @param text  Full extracted PDF text (mergePages: true).
 */
export function parseSbi(text: string): ParsedTransaction[] {
  const norm = text.replace(/\s+/g, " ");
  const headerIdx = norm.search(/Credit\s+Debit\s+Balance|Debit\s+Credit\s+Balance|Date.*Narration/i);
  const body = headerIdx >= 0 ? norm.slice(headerIdx) : norm;

  const SPLIT_RE = /(?=\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}[\s\-/][A-Za-z]{3}[\s\-/]\d{2,4}\b)/;
  const chunks = body.split(SPLIT_RE);

  const out: ParsedTransaction[] = [];
  for (const chunk of chunks) {
    const tx = parseChunk(chunk);
    if (tx) out.push(tx);
  }
  return out;
}
