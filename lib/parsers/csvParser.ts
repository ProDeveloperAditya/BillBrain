import type { ParsedTransaction, ParserResult } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitCsvRow(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

const MONTH_MAP: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/['"]/g, "");
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[/\-.\\](\d{1,2})[/\-.\\](\d{2,4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    let y = dmy[3];
    if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${m}-${d}`;
  }

  // MM/DD/YYYY (US format — only if month ≤ 12 and day > 12 to disambiguate)
  const mdy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (mdy) {
    const a = parseInt(mdy[1]), b = parseInt(mdy[2]);
    if (a <= 12 && b > 12) {
      return `${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
    }
  }

  // DD-Mon-YY or DD-Mon-YYYY (e.g. 20-Apr-26)
  const dMonY = s.match(/^(\d{1,2})[\s/\-]([A-Za-z]{3})[\s/\-](\d{2,4})$/);
  if (dMonY) {
    const m = MONTH_MAP[dMonY[2].toLowerCase()];
    if (m) {
      const d = dMonY[1].padStart(2, "0");
      let y = dMonY[3];
      if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
      return `${y}-${m}-${d}`;
    }
  }

  // Native Date fallback
  const nd = new Date(s);
  if (!isNaN(nd.getTime())) return nd.toISOString().slice(0, 10);

  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Handle parenthetical negatives: (1234) → -1234
  let s = raw.trim().replace(/[₹$€£¥\s]/g, "").replace(/,/g, "");
  if (s.startsWith("(") && s.endsWith(")")) s = "-" + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ─── Column detection ─────────────────────────────────────────────────────────

const DATE_KEYS   = ["date","txn date","transaction date","value date","posting date","trans date","dated","transaction_date","valuedate"];
const DESC_KEYS   = ["description","narration","particulars","remarks","details","merchant","beneficiary","note","transaction details","txn desc","info","ref detail","chq/ref number","trans particulars"];
const DEBIT_KEYS  = ["debit","withdrawal","dr","debit amount","withdraw","paid","debit(inr)","withdrawal amount","dr amt","debit amt"];
const CREDIT_KEYS = ["credit","deposit","cr","credit amount","received","credit(inr)","deposit amount","cr amt","credit amt"];
const AMOUNT_KEYS = ["amount","txn amount","transaction amount","amt","net amount"];
const TYPE_KEYS   = ["type","dr/cr","cr/dr","transaction type","txn type","dr cr","dr_cr","creditdebit"];
const BAL_KEYS    = ["balance","closing balance","available balance","avl bal","running balance","bal","closing bal"];

function findCol(headers: string[], aliases: string[]): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9/]/g, "").trim();
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => norm(h) === norm(alias));
    if (idx !== -1) return idx;
  }
  // Partial match
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => norm(h).includes(norm(alias)) || norm(alias).includes(norm(h)));
    if (idx !== -1) return idx;
  }
  return -1;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseCsv(csvString: string): ParserResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  const lines = csvString.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { success: false, data: [], errors: ["File appears empty"] };

  // Find header row (first row containing date-like or amount-like header)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const fields = splitCsvRow(lines[i]).map((f) => f.toLowerCase());
    if (fields.some((f) => DATE_KEYS.some((k) => f.includes(k))) ||
        fields.some((f) => AMOUNT_KEYS.some((k) => f.includes(k))) ||
        fields.some((f) => DESC_KEYS.some((k) => f.includes(k)))) {
      headerIdx = i;
      break;
    }
  }

  const headers = splitCsvRow(lines[headerIdx]);
  const colDate   = findCol(headers, DATE_KEYS);
  const colDesc   = findCol(headers, DESC_KEYS);
  const colDebit  = findCol(headers, DEBIT_KEYS);
  const colCredit = findCol(headers, CREDIT_KEYS);
  const colAmt    = findCol(headers, AMOUNT_KEYS);
  const colType   = findCol(headers, TYPE_KEYS);
  const colBal    = findCol(headers, BAL_KEYS);

  if (colDate === -1) errors.push("Could not detect date column — results may be incomplete");
  if (colDesc === -1) errors.push("Could not detect description column");
  if (colDebit === -1 && colCredit === -1 && colAmt === -1) {
    return { success: false, data: [], errors: ["Could not detect any amount column (debit/credit/amount)"] };
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = splitCsvRow(lines[i]);
    if (row.every((c) => !c)) continue; // blank row

    // Date
    const rawDate = colDate !== -1 ? (row[colDate] ?? "") : "";
    const date = parseDate(rawDate) ?? new Date().toISOString().slice(0, 10);
    if (!parseDate(rawDate) && rawDate) errors.push(`Row ${i}: unparseable date "${rawDate}"`);

    // Description
    const rawDescription = colDesc !== -1 ? (row[colDesc] ?? "").replace(/"/g, "").trim() : row.join(" ").trim().slice(0, 80);

    // Amount / type
    let amount = 0;
    let type: "DEBIT" | "CREDIT" = "DEBIT";
    let confidence = 0.9;

    if (colDebit !== -1 || colCredit !== -1) {
      const dAmt = colDebit  !== -1 ? parseAmount(row[colDebit]  ?? "") : null;
      const cAmt = colCredit !== -1 ? parseAmount(row[colCredit] ?? "") : null;
      if (dAmt && dAmt > 0) { amount = dAmt; type = "DEBIT"; }
      else if (cAmt && cAmt > 0) { amount = cAmt; type = "CREDIT"; }
      else { errors.push(`Row ${i}: no valid amount found`); continue; }
    } else if (colAmt !== -1) {
      const a = parseAmount(row[colAmt] ?? "");
      if (a === null) { errors.push(`Row ${i}: unparseable amount`); continue; }
      amount = Math.abs(a);
      // Infer type from sign or type column
      if (colType !== -1) {
        const t = (row[colType] ?? "").toLowerCase();
        type = /cr|credit|c\b/.test(t) ? "CREDIT" : "DEBIT";
      } else {
        type = a < 0 ? "DEBIT" : "CREDIT";
        confidence = 0.7;
      }
    }

    if (amount <= 0) continue;

    const balance = colBal !== -1 ? parseAmount(row[colBal] ?? "") ?? undefined : undefined;

    transactions.push({ date, rawDescription, amount, type, balance, currency: "INR", confidence });
  }

  return { success: transactions.length > 0, data: transactions, errors };
}
