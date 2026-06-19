import "server-only";
// pdf-parse is CommonJS; esModuleInterop handles the default import
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;
import type { ParsedTransaction, ParserResult } from "./types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function parseDate(raw: string): string | null {
  const s = raw.trim();

  // DD-Mon-YY / DD-Mon-YYYY
  const dMonY = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/](\d{2,4})$/);
  if (dMonY) {
    const m = MONTH_MAP[dMonY[2].toLowerCase()];
    if (m) {
      let y = dMonY[3];
      if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
      return `${y}-${m}-${dMonY[1].padStart(2, "0")}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const nd = new Date(s);
  return isNaN(nd.getTime()) ? null : nd.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number | null {
  const s = raw.replace(/[₹$€£¥,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.abs(n);
}

// ─── Line classifiers ─────────────────────────────────────────────────────────

// Date pattern at the start of a line (common in bank statements)
const DATE_AT_START = /^(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{1,2}[\s\-][A-Za-z]{3}[\s\-]\d{2,4})\s+/;

// Amount pattern (Indian format with optional commas)
const AMOUNT_RE = /(?:₹|Rs\.?|INR\s?)?([\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{1,2})?)/g;

// Lines we should skip
const SKIP_RE = /opening balance|closing balance|total|balance b\/f|balance c\/f|statement|account number|statement period|page \d|customer.*service|branch|ifsc|micr|available balance|^date\s/i;

/**
 * Extract transactions from a single text line.
 * Strategy: find date at start, then scan for amounts, classify last two as debit/credit.
 */
function parseLine(line: string): ParsedTransaction | null {
  const trimmed = line.trim();
  if (!trimmed || SKIP_RE.test(trimmed) || trimmed.length < 15) return null;

  const dateMatch = trimmed.match(DATE_AT_START);
  if (!dateMatch) return null;

  const date = parseDate(dateMatch[1]);
  if (!date) return null;

  const rest = trimmed.slice(dateMatch[0].length);

  // Collect all numbers in the rest of the line
  const amounts: number[] = [];
  let m: RegExpExecArray | null;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(rest)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(n) && n > 0) amounts.push(n);
  }

  if (amounts.length === 0) return null;

  // Extract description: text between date and first number
  const firstAmtIdx = rest.search(/[\d,]+(?:\.\d{1,2})?/);
  const rawDescription = (firstAmtIdx > 0 ? rest.slice(0, firstAmtIdx) : rest)
    .replace(/[|*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

  // Heuristic: in most bank statements the last column is balance, second-last is the txn amount.
  // If there are 2+ numbers, take the second-to-last as the transaction amount.
  // For debit/credit determination: look for DR/CR markers.
  const drCrMatch = rest.match(/\b(DR|CR|Dr|Cr)\b/);
  let type: "DEBIT" | "CREDIT" = "DEBIT";
  if (drCrMatch) {
    type = /cr/i.test(drCrMatch[1]) ? "CREDIT" : "DEBIT";
  } else if (/credit|deposit|received/i.test(rest)) {
    type = "CREDIT";
  }

  const amount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
  const balance = amounts.length >= 2 ? amounts[amounts.length - 1] : undefined;

  return {
    date,
    rawDescription: rawDescription || "Unknown",
    amount,
    type,
    balance,
    currency: "INR",
    confidence: drCrMatch ? 0.85 : 0.65,
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<ParserResult> {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  let pdfText: string;
  try {
    const data = await pdfParse(buffer);
    pdfText = data.text;
  } catch (e) {
    return { success: false, data: [], errors: [`PDF parsing failed: ${String(e)}`] };
  }

  const lines = pdfText.split("\n");

  for (const line of lines) {
    const tx = parseLine(line);
    if (tx) transactions.push(tx);
  }

  if (transactions.length === 0) {
    errors.push("No transactions found — ensure this is a text-based (not scanned) PDF bank statement");
  }

  return { success: transactions.length > 0, data: transactions, errors };
}
