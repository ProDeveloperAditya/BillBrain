/**
 * Map raw transaction descriptions to clean merchant display names.
 * Handles Indian-bank UPI strings (e.g. "UPI/DR/<ref>/<payee>/<bank>/<vpa>/<note>")
 * by extracting the payee/VPA, then falling back to cleaned raw text.
 */

interface NormalizeResult {
  merchantName: string;  // display name ("Zomato")
  normalizedName: string; // lowercase key ("zomato")
}

// Canonical name → display name
const CANONICAL: Record<string, string> = {
  // Food delivery / quick-commerce
  zomato: "Zomato",
  swiggy: "Swiggy",
  dunzo: "Dunzo",
  blinkit: "Blinkit",
  zepto: "Zepto",
  instamart: "Swiggy Instamart",
  bigbasket: "BigBasket",
  jiomart: "JioMart",
  grofers: "Blinkit",

  // Streaming & entertainment
  netflix: "Netflix",
  spotify: "Spotify",
  "amazon prime": "Amazon Prime",
  primevideo: "Amazon Prime",
  hotstar: "Disney+ Hotstar",
  "disney+": "Disney+ Hotstar",
  "jio cinema": "JioCinema",
  "apple music": "Apple Music",
  "youtube premium": "YouTube Premium",
  "zee5": "ZEE5",
  sonyliv: "SonyLIV",
  mxplayer: "MX Player",

  // AI & cloud subscriptions
  "claude.ai": "Claude",
  claude: "Claude",
  anthropic: "Claude",
  openai: "OpenAI",
  chatgpt: "OpenAI",
  googlecloud: "Google Cloud",
  googleclou: "Google Cloud",
  "google cloud": "Google Cloud",
  google: "Google",

  // Fitness
  "cult.fit": "Cult.fit",
  cultfit: "Cult.fit",
  curefit: "Cult.fit",
  "cure.fit": "Cult.fit",
  "gold's gym": "Gold's Gym",

  // Ride-hailing & transport
  ola: "Ola",
  uber: "Uber",
  "uber eats": "Uber Eats",
  rapido: "Rapido",

  // Shopping
  amazon: "Amazon",
  flipkart: "Flipkart",
  myntra: "Myntra",
  meesho: "Meesho",
  nykaa: "Nykaa",
  ajio: "AJIO",
  tatacliq: "Tata CLiQ",
  snapdeal: "Snapdeal",

  // Payments & wallets
  paytm: "Paytm",
  phonepe: "PhonePe",
  googlepay: "Google Pay",
  gpay: "Google Pay",
  mobikwik: "MobiKwik",
  freecharge: "FreeCharge",
  cred: "CRED",

  // Utilities & telecom
  bescom: "BESCOM",
  airtel: "Airtel",
  jio: "Jio",
  vodafone: "Vodafone",
  bsnl: "BSNL",
  "act fibernet": "ACT Fibernet",
  hathway: "Hathway",
  bwssb: "BWSSB",
  bbmp: "BBMP",

  // Coffee & cafes
  "blue tokai": "Blue Tokai Coffee",
  "third wave": "Third Wave Coffee",
  starbucks: "Starbucks",
  "cafe coffee day": "Café Coffee Day",
  barista: "Barista",
  "flying squirrel": "Flying Squirrel Coffee",

  // Banks & finance
  zerodha: "Zerodha",
  groww: "Groww",
  upstox: "Upstox",
  policybazaar: "PolicyBazaar",
  acko: "Acko",

  // Healthcare
  "apollo pharmacy": "Apollo Pharmacy",
  netmeds: "Netmeds",
  "1mg": "1mg",
  practo: "Practo",

  // Travel
  makemytrip: "MakeMyTrip",
  goibibo: "Goibibo",
  cleartrip: "Cleartrip",
  "yatra.com": "Yatra",
  irctc: "IRCTC",
  ixigo: "ixigo",

  // Grocery / hypermarket
  dmart: "D-Mart",
  "reliance fresh": "Reliance Fresh",
};

// Generic payment terms that should NOT be treated as merchant brands.
const GENERIC = new Set(["upi", "neft", "imps", "rtgs", "salary", "rent", "self", "payment", "paytm transfer"]);

const SPECIAL_RE = /[^a-z0-9\s.'+&-]/gi;
const STRIP_RE = /\b(?:upi|neft|imps|rtgs|ref|txn|no|order|id|payment|paid|purchase|#\w+|\*{2,}\d+|\d{10,}|xx\d+)\b/gi;

function titleCase(s: string): string {
  return s
    .replace(SPECIAL_RE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 30);
}

function brandMatch(search: string): NormalizeResult | null {
  const s = search.toLowerCase();
  for (const key of Object.keys(CANONICAL).sort((a, b) => b.length - a.length)) {
    if (GENERIC.has(key)) continue;
    if (key.length >= 3 && s.includes(key)) {
      return { merchantName: CANONICAL[key], normalizedName: key };
    }
  }
  return null;
}

/**
 * Parse an Indian-bank UPI string into payee + VPA.
 * Formats: "UPI/DR/<ref>/<PAYEE>/<BANK>/<vpa>/<note>" (SBI),
 *          "UPI-PAYEE-vpa@bank-..." etc.
 */
function parseUpi(raw: string): { payee: string; vpa: string } | null {
  if (!/\bUPI\b/i.test(raw)) return null;

  if (raw.includes("/")) {
    const parts = raw.split("/").map((p) => p.trim());
    const u = parts.findIndex((p) => /^UPI$/i.test(p));
    if (u !== -1 && parts.length > u + 3) {
      const payee = parts[u + 3] ?? "";
      const vpa = parts[u + 5] ?? parts[u + 4] ?? "";
      if (payee && !/^(dr|cr)$/i.test(payee)) return { payee, vpa };
    }
  }
  return null;
}

export function normalizeRaw(raw: string): NormalizeResult {
  // 1. UPI-structured strings → use payee/VPA, not the whole noisy string.
  const upi = parseUpi(raw);
  if (upi) {
    const brand = brandMatch(`${upi.payee} ${upi.vpa}`);
    if (brand) return brand;
    const name = titleCase(upi.payee) || titleCase(upi.vpa) || "Unknown";
    return { merchantName: name, normalizedName: name.toLowerCase() };
  }

  // 2. Non-UPI: strip noise, then exact / prefix / fallback.
  const s = raw.toLowerCase().replace(STRIP_RE, " ").replace(SPECIAL_RE, " ").replace(/\s+/g, " ").trim();

  if (CANONICAL[s]) return { merchantName: CANONICAL[s], normalizedName: s };

  const brand = brandMatch(s);
  if (brand) return brand;

  const fallback = titleCase(s);
  return { merchantName: fallback || "Unknown", normalizedName: s.slice(0, 30) || "unknown" };
}
