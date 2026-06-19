/**
 * Map raw transaction descriptions to clean merchant display names.
 * Lookup is case-insensitive; falls back to cleaned raw text.
 */

interface NormalizeResult {
  merchantName: string;  // display name ("Zomato")
  normalizedName: string; // lowercase key ("zomato")
}

// Canonical name → display name
const CANONICAL: Record<string, string> = {
  // Food delivery
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
  "ola money": "Ola Money",

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
  bhim: "BHIM",

  // Utilities
  bescom: "BESCOM",
  tpddl: "TPDDL",
  bescom_bill: "BESCOM",
  airtel: "Airtel",
  jio: "Jio",
  vodafone: "Vodafone",
  vi: "Vi (Vodafone Idea)",
  bsnl: "BSNL",
  "act fibernet": "ACT Fibernet",
  hathway: "Hathway",
  "you broadband": "YOU Broadband",
  neeladri: "BWSSB",
  bwssb: "BWSSB",
  bbmp: "BBMP",

  // Coffee & cafes
  "blue tokai": "Blue Tokai Coffee",
  "third wave": "Third Wave Coffee",
  starbucks: "Starbucks",
  "cafe coffee day": "Café Coffee Day",
  ccd: "Café Coffee Day",
  barista: "Barista",
  "social": "Social",
  "flying squirrel": "Flying Squirrel Coffee",

  // Banks & finance
  hdfc: "HDFC",
  icici: "ICICI",
  sbi: "SBI",
  axis: "Axis Bank",
  kotak: "Kotak",
  "bajaj finance": "Bajaj Finance",
  zerodha: "Zerodha",
  groww: "Groww",
  upstox: "Upstox",
  "policybazaar": "PolicyBazaar",
  acko: "Acko",

  // Healthcare
  "apollo pharmacy": "Apollo Pharmacy",
  apollo: "Apollo",
  netmeds: "Netmeds",
  "1mg": "1mg",
  practo: "Practo",
  lybrate: "Lybrate",

  // Travel
  makemytrip: "MakeMyTrip",
  mmt: "MakeMyTrip",
  goibibo: "Goibibo",
  cleartrip: "Cleartrip",
  "yatra.com": "Yatra",
  irctc: "IRCTC",
  ixigo: "ixigo",

  // Grocery / hypermarket
  dmart: "D-Mart",
  reliance: "Reliance Fresh",
  "more supermarket": "More Supermarket",
  "star bazaar": "Star Bazaar",
  "spencer's": "Spencer's",

  // Salary / transfers (not merchants but common in SMS)
  salary: "Salary",
  neft: "NEFT Transfer",
  imps: "IMPS Transfer",
  upi: "UPI Transfer",
  rent: "Rent",
};

// Noise tokens to strip before lookup
const STRIP_RE = /\b(?:upi|neft|imps|rtgs|ref|txn|no|order|id|payment|paid|purchase|#\w+|\*{2,}\d+|\d{10,}|xx\d+)\b/gi;
const SPECIAL_RE = /[^a-z0-9\s.'+&-]/gi;

export function normalizeRaw(raw: string): NormalizeResult {
  // 1. Lowercase and remove noise
  let s = raw.toLowerCase().replace(STRIP_RE, " ").replace(SPECIAL_RE, " ").replace(/\s+/g, " ").trim();

  // 2. Try full-string exact match
  if (CANONICAL[s]) return { merchantName: CANONICAL[s], normalizedName: s };

  // 3. Try longest-prefix match
  for (const key of Object.keys(CANONICAL).sort((a, b) => b.length - a.length)) {
    if (s.includes(key)) {
      return { merchantName: CANONICAL[key], normalizedName: key };
    }
  }

  // 4. Fallback: title-case cleaned string, max 30 chars
  const fallback = s.slice(0, 30).replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  return { merchantName: fallback || "Unknown", normalizedName: s.slice(0, 30) };
}
