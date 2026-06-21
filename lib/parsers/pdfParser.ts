import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedTransaction, ParserResult } from "./types";

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

const DATE = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[\s\-/][A-Za-z]{3}[\s\-/]\d{2,4})/;
// Trailing Credit / Debit / Balance columns (SBI, HDFC, ICICI, Axis, …). One of
// credit/debit is 0; balance always has decimals.
const TRIPLE = /([\d,]+(?:\.\d{1,2})?)\s+([\d,]+(?:\.\d{1,2})?)\s+([\d,]+\.\d{2})/;
// A single amount followed by a balance (banks with one Amount column).
const PAIR = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/;

function cleanDesc(s: string): string {
  return s.replace(/[-|*]+\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 90) || "Transaction";
}

/** Parse one date-led chunk of statement text into a transaction. */
function parseChunk(chunk: string): ParsedTransaction | null {
  const dm = chunk.match(DATE);
  if (!dm) return null;
  const date = parseDate(dm[1]);
  if (!date) return null;

  const rest = chunk.slice(dm[0].length);

  // Primary: Credit / Debit / Balance three-column layout.
  const tm = rest.match(TRIPLE);
  if (tm) {
    const credit = num(tm[1]);
    const debit = num(tm[2]);
    const amount = debit > 0 ? debit : credit;
    if (amount > 0) {
      return {
        date,
        rawDescription: cleanDesc(rest.slice(0, tm.index)),
        amount,
        type: debit > 0 ? "DEBIT" : "CREDIT",
        balance: num(tm[3]),
        currency: "INR",
        confidence: 0.9,
      };
    }
  }

  // Fallback: single Amount + Balance, infer direction from DR/CR or keywords.
  const pm = rest.match(PAIR);
  if (pm) {
    const amount = num(pm[1]);
    if (amount > 0) {
      const drCr = rest.match(/\b(DR|CR|Dr|Cr)\b/);
      const type: "DEBIT" | "CREDIT" =
        drCr ? (/cr/i.test(drCr[1]) ? "CREDIT" : "DEBIT")
             : /credit|deposit|received|refund/i.test(rest) ? "CREDIT" : "DEBIT";
      return {
        date,
        rawDescription: cleanDesc(rest.slice(0, pm.index)),
        amount,
        type,
        balance: num(pm[2]),
        currency: "INR",
        confidence: 0.65,
      };
    }
  }

  return null;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<ParserResult> {
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join(" ") : result.text;
  } catch (e) {
    return { success: false, data: [], errors: [`Couldn't read this PDF: ${String(e)}`] };
  }

  // Normalise whitespace, then skip ahead to the transaction table if present.
  const norm = text.replace(/\s+/g, " ");
  const headerIdx = norm.search(/Credit\s+Debit\s+Balance|Withdrawal.*Deposit|Date.*Narration/i);
  const body = headerIdx >= 0 ? norm.slice(headerIdx) : norm;

  // Split into one chunk per dated row.
  const chunks = body.split(/(?=\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{1,2}[\s\-/][A-Za-z]{3}[\s\-/]\d{2,4}\b)/);

  const transactions: ParsedTransaction[] = [];
  for (const chunk of chunks) {
    const tx = parseChunk(chunk);
    if (tx) transactions.push(tx);
  }

  if (transactions.length === 0) {
    return {
      success: false,
      data: [],
      errors: [
        "No transactions found. This looks like a summary page or a scanned image. " +
        "Upload a statement page with a dated transaction table, or export it as CSV from net banking.",
      ],
    };
  }

  return { success: true, data: transactions, errors: [] };
}
