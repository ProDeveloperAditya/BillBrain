/**
 * Shared synthetic statement dataset.
 *
 * Realistic but entirely fictional — fake account numbers and a generic
 * holder name. Merchants are chosen to exercise the categoryTagger across
 * many categories. Spans three months so the WLS forecast unlocks.
 *
 * Used only by scripts/generateStatements.ts (dev-time fixture generation).
 */

export interface SampleTxn {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Merchant / counterparty as it would appear in a UPI/NEFT narration */
  merchant: string;
  /** Payment rail, used to build bank-specific narration strings */
  mode: "UPI" | "NEFT" | "IMPS" | "POS" | "ACH" | "ATM";
  amount: number;
  type: "DEBIT" | "CREDIT";
}

const MONTHS = ["2026-04", "2026-05", "2026-06"];

/**
 * One month's worth of recurring + discretionary spending. Day-of-month and
 * amounts jitter slightly per month so the three months aren't identical
 * (keeps the trend chart and forecast meaningful).
 */
function monthTransactions(monthIdx: number): SampleTxn[] {
  const ym = MONTHS[monthIdx];
  const d = (day: number) => `${ym}-${String(day).padStart(2, "0")}`;
  const jitter = monthIdx * 0.04; // up to ~8% drift across months
  const j = (n: number) => Math.round(n * (1 + jitter));

  return [
    // ── Income ──
    { date: d(1),  merchant: "ACME SOFTWARE PVT LTD SALARY", mode: "NEFT", amount: 92000, type: "CREDIT" },

    // ── Rent (recurring) ──
    { date: d(3),  merchant: "RENT PAYMENT LANDLORD",        mode: "IMPS", amount: 24000, type: "DEBIT" },

    // ── Subscriptions (recurring) ──
    { date: d(2),  merchant: "NETFLIX SUBSCRIPTION",         mode: "UPI",  amount: 649,   type: "DEBIT" },
    { date: d(4),  merchant: "SPOTIFY INDIA",                mode: "UPI",  amount: 119,   type: "DEBIT" },
    { date: d(5),  merchant: "AMAZON PRIME MEMBERSHIP",      mode: "UPI",  amount: 299,   type: "DEBIT" },

    // ── Groceries ──
    { date: d(6),  merchant: "BLINKIT GROCERY",              mode: "UPI",  amount: j(840), type: "DEBIT" },
    { date: d(14), merchant: "BIGBASKET SUPERMARKET",        mode: "UPI",  amount: j(1320), type: "DEBIT" },
    { date: d(22), merchant: "ZEPTO INSTANT",                mode: "UPI",  amount: j(560), type: "DEBIT" },

    // ── Food & dining ──
    { date: d(7),  merchant: "ZOMATO ORDER",                 mode: "UPI",  amount: j(520), type: "DEBIT" },
    { date: d(11), merchant: "SWIGGY FOOD DELIVERY",         mode: "UPI",  amount: j(430), type: "DEBIT" },
    { date: d(19), merchant: "SWIGGY FOOD DELIVERY",         mode: "UPI",  amount: j(610), type: "DEBIT" },
    { date: d(26), merchant: "DOMINOS PIZZA",                mode: "UPI",  amount: j(740), type: "DEBIT" },

    // ── Coffee ──
    { date: d(9),  merchant: "STARBUCKS COFFEE",             mode: "UPI",  amount: j(380), type: "DEBIT" },
    { date: d(18), merchant: "BLUE TOKAI COFFEE",            mode: "UPI",  amount: j(450), type: "DEBIT" },

    // ── Transport ──
    { date: d(8),  merchant: "UBER RIDE",                    mode: "UPI",  amount: j(260), type: "DEBIT" },
    { date: d(15), merchant: "IRCTC TRAIN BOOKING",          mode: "UPI",  amount: j(1250), type: "DEBIT" },
    { date: d(24), merchant: "INDIAN OIL FUEL",              mode: "POS",  amount: j(2000), type: "DEBIT" },

    // ── Shopping ──
    { date: d(12), merchant: "AMAZON RETAIL",                mode: "UPI",  amount: j(1899), type: "DEBIT" },
    { date: d(20), merchant: "MYNTRA FASHION",               mode: "UPI",  amount: j(2450), type: "DEBIT" },

    // ── Utilities ──
    { date: d(10), merchant: "AIRTEL RECHARGE",              mode: "UPI",  amount: 399,   type: "DEBIT" },
    { date: d(16), merchant: "BESCOM ELECTRICITY BILL",      mode: "UPI",  amount: j(1450), type: "DEBIT" },

    // ── Healthcare ──
    { date: d(13), merchant: "PHARMEASY MEDICINES",          mode: "UPI",  amount: j(680), type: "DEBIT" },
    { date: d(21), merchant: "CULT FIT MEMBERSHIP",          mode: "UPI",  amount: 1499,  type: "DEBIT" },

    // ── Entertainment ──
    { date: d(23), merchant: "BOOKMYSHOW PVR CINEMA",        mode: "UPI",  amount: j(700), type: "DEBIT" },

    // ── Travel ──
    { date: d(17), merchant: "MAKEMYTRIP HOTEL",             mode: "UPI",  amount: j(3200), type: "DEBIT" },

    // ── Investments ──
    { date: d(25), merchant: "ZERODHA SIP MUTUAL FUND",      mode: "ACH",  amount: 5000,  type: "DEBIT" },

    // ── Refund (credit) ──
    { date: d(27), merchant: "AMAZON REFUND",                mode: "UPI",  amount: j(899), type: "CREDIT" },
  ];
}

/** All three months, chronologically sorted. */
export function buildSampleTransactions(): SampleTxn[] {
  const all: SampleTxn[] = [];
  for (let m = 0; m < MONTHS.length; m++) all.push(...monthTransactions(m));
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export const OPENING_BALANCE = 50000;
export const ACCOUNT_HOLDER = "ADITYA RAJ";
