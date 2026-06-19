import type { ParsedTransaction, ParserResult } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
  jan:"01",feb:"02",mar:"03",apr:"04",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = raw.trim();

  // "April 7, 2026" or "7 April 2026"
  const longDate = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/) ??
                   s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (longDate) {
    const dayPart  = longDate[0].match(/([A-Za-z]+)/) ? longDate[2] : longDate[1];
    const monPart  = longDate[0].match(/([A-Za-z]+)/) ? longDate[1] : longDate[2];
    const yearPart = longDate[3];
    const m = MONTH_MAP[monPart.toLowerCase()];
    if (m) return `${yearPart}-${m}-${dayPart.padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const nd = new Date(s);
  return isNaN(nd.getTime()) ? new Date().toISOString().slice(0, 10) : nd.toISOString().slice(0, 10);
}

function extractAmount(line: string): number | null {
  const m = line.match(/(?:₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/) ??
            line.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

const BILLING_DATE_RE = /(?:billing date|billed on|charged on|payment date|invoice date|date of charge)[:\s]+([^\n]+)/i;
const MERCHANT_RE     = /(?:from|by|merchant|vendor|company|biller|subscription to|thank you for (?:using|choosing)|your .*subscription(?:\s+with)?)[:\s]+([A-Za-z0-9&._\s-]{2,50})/i;
const AMOUNT_LINE_RE  = /(?:amount|total|charged|billed|payment|subtotal|grand total|invoice total)[:\s]+(?:₹|Rs\.?|INR|\$|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/i;

// Well-known subscription services to detect from email context
const SERVICE_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /netflix/i,                name: "Netflix" },
  { re: /spotify/i,                name: "Spotify" },
  { re: /amazon prime|primevideo/i,name: "Amazon Prime" },
  { re: /disney.*hotstar|hotstar/i,name: "Disney+ Hotstar" },
  { re: /apple (?:music|one|icloud|tv)/i, name: "Apple" },
  { re: /youtube premium/i,        name: "YouTube Premium" },
  { re: /google one/i,             name: "Google One" },
  { re: /microsoft 365|office 365/i, name: "Microsoft 365" },
  { re: /dropbox/i,                name: "Dropbox" },
  { re: /notion/i,                 name: "Notion" },
  { re: /cult\.?fit|curefit/i,     name: "Cult.fit" },
  { re: /airtel/i,                 name: "Airtel" },
  { re: /jio\b/i,                  name: "Jio" },
  { re: /swiggy/i,                 name: "Swiggy" },
  { re: /zomato/i,                 name: "Zomato" },
  { re: /figma/i,                  name: "Figma" },
  { re: /canva/i,                  name: "Canva" },
  { re: /zoom/i,                   name: "Zoom" },
  { re: /slack/i,                  name: "Slack" },
];

function detectServiceName(text: string): string | null {
  for (const { re, name } of SERVICE_PATTERNS) {
    if (re.test(text)) return name;
  }
  return null;
}

// ─── Parse a single email block ───────────────────────────────────────────────

function parseEmailBlock(block: string): ParsedTransaction | null {
  const amount = extractAmount(block) ??
                 (() => {
                   const m = block.match(AMOUNT_LINE_RE);
                   return m ? parseFloat(m[1].replace(/,/g, "")) : null;
                 })();

  if (!amount || amount <= 0) return null;

  const dateMatch  = block.match(BILLING_DATE_RE)?.[1];
  const date = parseDate(dateMatch ?? block.match(/(?:on|dated?)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/\-][A-Za-z0-9]+[/\-]\d{2,4})/i)?.[1]);

  const serviceName = detectServiceName(block);
  let rawDescription = serviceName ?? "";

  if (!rawDescription) {
    rawDescription = block.match(MERCHANT_RE)?.[1]?.trim().slice(0, 60) ?? "Unknown";
  }

  // All email billing lines are debits (charges/subscriptions)
  return {
    date,
    rawDescription,
    amount,
    type: "DEBIT",
    currency: "INR",
    confidence: serviceName ? 0.9 : 0.65,
  };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseEmail(text: string): ParserResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Split on blank lines or common email section separators
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 15);

  for (const block of blocks) {
    // Skip blocks with no amount-like content
    if (!/(?:₹|Rs\.?|INR|\$|€|£)\s*[\d,]+/.test(block)) continue;

    const tx = parseEmailBlock(block);
    if (tx) transactions.push(tx);
    else errors.push(`No valid transaction found in block: "${block.slice(0, 60)}"`);
  }

  // If no per-block results, try the whole text as one unit
  if (transactions.length === 0 && blocks.length > 0) {
    const tx = parseEmailBlock(text);
    if (tx) transactions.push(tx);
    else errors.push("Could not extract any transaction from the pasted email");
  }

  return { success: transactions.length > 0, data: transactions, errors };
}
