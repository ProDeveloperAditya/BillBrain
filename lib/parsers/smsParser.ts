import type { ParsedTransaction, ParserResult } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = raw.trim();

  // DD-Mon-YY / DD-Mon-YYYY / DD Mon YY
  const dMonY = s.match(/(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/](\d{2,4})/);
  if (dMonY) {
    const m = MONTH_MAP[dMonY[2].toLowerCase()];
    if (m) {
      const d = dMonY[1].padStart(2, "0");
      let y = dMonY[3];
      if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
      return `${y}-${m}-${d}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const mo = dmy[2].padStart(2, "0");
    let y = dmy[3];
    if (y.length === 2) y = parseInt(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${mo}-${d}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const nd = new Date(s);
  return isNaN(nd.getTime()) ? new Date().toISOString().slice(0, 10) : nd.toISOString().slice(0, 10);
}

function extractAmount(s: string): number | null {
  const m = s.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ??
            s.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function cleanMerchant(raw: string): string {
  return raw.replace(/^(?:upi|neft|imps|rtgs)[/\-\s]*/i, "")
            .replace(/\/\w{10,}.*$/, "")   // strip UPI ref IDs
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 60);
}

// ─── SMS patterns ─────────────────────────────────────────────────────────────

interface SmsPattern {
  re: RegExp;
  extract: (m: RegExpMatchArray) => Partial<ParsedTransaction> | null;
}

const PATTERNS: SmsPattern[] = [
  // Pattern: "debited Rs./INR X ... Info: UPI/MERCHANT ... on DATE"
  {
    re: /(?:debited|deducted|withdrawn|paid)\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2}).*?(?:Info[:\s]+|to\s+|Ref[:\s]+)([A-Za-z0-9\s&*/._-]{2,50}).*?(?:on\s+|dated?\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "DEBIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "INR/Rs X debited from A/c ... Info: MERCHANT on DATE"
  {
    re: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2})\s+(?:has been\s+)?(?:debited|deducted|withdrawn).*?(?:Info[:\s]+|UPI[/\-]|to\s+)([A-Za-z0-9\s&*/._-]{2,50}).*?(?:on\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "DEBIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "credited INR/Rs X ... from/by MERCHANT on DATE"
  {
    re: /(?:credited|deposited|received)\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2}).*?(?:from\s+|by\s+|Info[:\s]+)([A-Za-z0-9\s&*._-]{2,50}).*?(?:on\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "CREDIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "INR/Rs X credited to A/c ... MERCHANT on DATE"
  {
    re: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2})\s+(?:has been\s+)?(?:credited|deposited).*?(?:Info[:\s]+|from\s+|by\s+)([A-Za-z0-9\s&*/._-]{2,50}).*?(?:on\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "CREDIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "Spent INR X using ... at MERCHANT on DATE" (card swipe)
  {
    re: /[Ss]pent\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2})\s+using.*?(?:at\s+|for\s+|on\s+(?!.*\d{1,2}[/\-]))([A-Za-z0-9\s&*._-]{2,50})(?:\s+on\s+(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}))?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "DEBIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "You have paid Rs. X to MERCHANT via UPI on DATE"
  {
    re: /(?:You have paid|Payment of|Paid)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d{0,2})\s+(?:Rs\.?|INR|₹)?\s*(?:to|for)\s+([A-Za-z0-9\s&*._-]{2,50}).*?(?:on\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      return { amount, type: "DEBIT", rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },

  // Pattern: "A/c XX1234 debited Rs.X ... Info: TEXT on DATE"
  {
    re: /[Aa]\/[Cc]\s+\w+\s+(?:debited|credited)\s+(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d{0,2})[^.]*?(?:Info[:\s]+|for\s+|to\s+)([A-Za-z0-9\s&*/._-]{2,50}).*?(?:on\s+)?(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})?/i,
    extract(m) {
      const sms = m[0];
      const amount = parseFloat(m[1].replace(/,/g, ""));
      const type: "DEBIT" | "CREDIT" = /debited/i.test(sms) ? "DEBIT" : "CREDIT";
      return { amount, type, rawDescription: cleanMerchant(m[2]), date: parseDate(m[3]) };
    },
  },
];

// Fallback: generic amount + debit/credit keyword
function fallbackParse(sms: string): Partial<ParsedTransaction> | null {
  const amount = extractAmount(sms);
  if (!amount) return null;

  const type: "DEBIT" | "CREDIT" = /credit(?:ed)?|deposit(?:ed)?|received/i.test(sms) ? "CREDIT" : "DEBIT";

  // Try to get merchant from UPI ref
  const upiMerchant = sms.match(/UPI[/\-\s]([A-Za-z0-9&._-]{2,40})/i)?.[1] ??
                      sms.match(/to\s+([A-Za-z][A-Za-z0-9\s&*._-]{1,40})/i)?.[1] ??
                      sms.match(/for\s+([A-Za-z][A-Za-z0-9\s&*._-]{1,40})/i)?.[1] ??
                      "Unknown";

  const dateMatch = sms.match(/(\d{1,2}[\s\-\/][A-Za-z]{3}[\s\-\/]\d{2,4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/);

  return { amount, type, rawDescription: cleanMerchant(upiMerchant), date: parseDate(dateMatch?.[1]) };
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseSms(text: string): ParserResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Split on blank lines or obvious SMS separators
  const blocks = text.split(/\n{2,}|(?=(?:Rs\.|INR|₹)\s*[\d,]+.*(?:debit|credit))/i)
                     .map((b) => b.trim())
                     .filter((b) => b.length > 10);

  for (const block of blocks) {
    let parsed: Partial<ParsedTransaction> | null = null;

    for (const p of PATTERNS) {
      const m = block.match(p.re);
      if (m) { parsed = p.extract(m); break; }
    }

    if (!parsed || !parsed.amount) parsed = fallbackParse(block);
    if (!parsed || !parsed.amount) { errors.push(`Could not parse: "${block.slice(0, 60)}..."`); continue; }

    transactions.push({
      date: parsed.date ?? new Date().toISOString().slice(0, 10),
      rawDescription: parsed.rawDescription ?? "Unknown",
      amount: parsed.amount,
      type: parsed.type ?? "DEBIT",
      currency: "INR",
      confidence: parsed.rawDescription && parsed.rawDescription !== "Unknown" ? 0.8 : 0.5,
    });
  }

  return { success: transactions.length > 0 || errors.length === 0, data: transactions, errors };
}
