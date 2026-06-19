import "server-only";
import type { ParsedTransaction, ParserResult } from "./types";

// pdf-parse v2 is class-based: `new PDFParse({ data }).getText()`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (opts: { data: Buffer }) => {
    getText: () => Promise<{ text: string }>;
    destroy: () => Promise<void>;
  };
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  const s = raw.trim();

  // DD-Mon-YY / DD-Mon-YYYY
  const dMonY = s.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3})[\s\-/](\d{2,4})$/);
  if (dMonY) {
    const m = MONTH_MAP[dMonY[2].toLowerCase()];
    if (m) {
      let y = dMonY[3];
      if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
      return `${y}-${m}-${dMonY[1].padStart(2, "0")}`;
    }
  }

  // DD-MM-YY / DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    let y = dmy[3];
    if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const nd = new Date(s);
  return isNaN(nd.getTime()) ? null : nd.toISOString().slice(0, 10);
}

function num(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// ─── Row patterns ───────────────────────────────────────────────────────────--

// A transaction row starts with a date.
const DATE_START = /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[\s\-/][A-Za-z]{3}[\s\-/]\d{2,4})\b/;

// Indian bank statements (SBI etc.) end each row with: Credit  Debit  Balance.
// One of credit/debit is 0; the other is the txn amount; balance always has decimals.
const TXN_END =
  /\s+([\d,]+(?:\.\d{1,2})?|0)\s+([\d,]+(?:\.\d{1,2})?|0)\s+([\d,]+\.\d{2})\s*$/;

const SKIP_RE =
  /opening balance|closing balance|transaction overview|balance b\/f|balance c\/f|statement period|page \d|customer.*care|ifsc|micr code|available balance|account holder|^date\b/i;

/** Parse a (possibly merged) SBI-style row with trailing Credit/Debit/Balance columns. */
function parseSbiRow(row: string): ParsedTransaction | null {
  const dm = row.match(DATE_START);
  if (!dm) return null;
  const em = row.match(TXN_END);
  if (!em) return null;

  const date = parseDate(dm[1]);
  if (!date) return null;

  const credit = num(em[1]);
  const debit = num(em[2]);
  const balance = num(em[3]);

  const amount = debit > 0 ? debit : credit;
  if (!(amount > 0)) return null;
  const type: "DEBIT" | "CREDIT" = debit > 0 ? "DEBIT" : "CREDIT";

  const rawDescription =
    row
      .slice(dm[0].length, row.length - em[0].length)
      .replace(/[-|*]+\s*$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90) || "Transaction";

  return { date, rawDescription, amount, type, balance, currency: "INR", confidence: 0.9 };
}

/** Generic fallback for other banks: date at start, last two numbers = amount, balance. */
function parseGenericRow(row: string): ParsedTransaction | null {
  const dm = row.match(DATE_START);
  if (!dm) return null;
  const date = parseDate(dm[1]);
  if (!date) return null;

  const rest = row.slice(dm[0].length);
  const amounts: number[] = [];
  const re = /([\d]{1,3}(?:,[\d]{3})+(?:\.\d{1,2})?|\d+\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(n) && n > 0) amounts.push(n);
  }
  if (amounts.length === 0) return null;

  const drCr = rest.match(/\b(DR|CR|Dr|Cr)\b/);
  const type: "DEBIT" | "CREDIT" =
    drCr ? (/cr/i.test(drCr[1]) ? "CREDIT" : "DEBIT")
         : /credit|deposit|received/i.test(rest) ? "CREDIT" : "DEBIT";

  const firstAmtIdx = rest.search(/[\d,]+\.\d{2}/);
  const rawDescription =
    (firstAmtIdx > 0 ? rest.slice(0, firstAmtIdx) : rest)
      .replace(/[|*-]+\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 90) || "Transaction";

  const amount = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[amounts.length - 1];
  const balance = amounts.length >= 2 ? amounts[amounts.length - 1] : undefined;

  return { date, rawDescription, amount, type, balance, currency: "INR", confidence: drCr ? 0.8 : 0.6 };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<ParserResult> {
  let pdfText: string;
  try {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      pdfText = result.text ?? "";
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (e) {
    return {
      success: false,
      data: [],
      errors: [`Couldn't read this PDF: ${String(e)}`],
    };
  }

  const lines = pdfText.split("\n").map((l) => l.trim());
  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !DATE_START.test(line) || SKIP_RE.test(line)) continue;

    // Merge wrapped continuation lines until the Credit/Debit/Balance tail appears
    // (or we hit the next dated row / run out).
    let row = line;
    let j = i;
    while (!TXN_END.test(row) && j + 1 < lines.length && lines[j + 1] && !DATE_START.test(lines[j + 1])) {
      j++;
      row = `${row} ${lines[j]}`.trim();
    }

    const tx = parseSbiRow(row) ?? parseGenericRow(row);
    if (tx) transactions.push(tx);
    i = j;
  }

  if (transactions.length === 0) {
    return {
      success: false,
      data: [],
      errors: [
        "No transactions found. This looks like a summary page or a scanned image. " +
        "Upload a statement with a dated transaction table, or export it as CSV from net banking.",
      ],
    };
  }

  return { success: true, data: transactions, errors: [] };
}
