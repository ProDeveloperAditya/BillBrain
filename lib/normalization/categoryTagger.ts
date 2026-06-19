import type { CategoryName } from "@prisma/client";

interface TagRule {
  pattern: RegExp;
  category: CategoryName;
}

const RULES: TagRule[] = [
  // Salary / income — check first (high priority)
  { pattern: /salary|payroll|stipend|income|neft.*credit|credited.*neft|employer|wages/i,  category: "SALARY_INCOME" },
  { pattern: /dividend|interest.*credit|cashback|refund.*credit/i,                          category: "SALARY_INCOME" },

  // Rent / housing
  { pattern: /rent|landlord|owner|maintenance|society|housing|apartment|pg\b|hostel/i,      category: "RENT_HOUSING" },

  // Groceries
  { pattern: /bigbasket|blinkit|zepto|dunzo|grofers|jiomart|instamart|d-mart|dmart|reliance fresh|more supermarket|star bazaar|grocery|sabji|vegetables/i, category: "GROCERIES" },

  // Subscriptions
  { pattern: /netflix|spotify|amazon prime|primevideo|disney|hotstar|jiocinema|zee5|sonyliv|mxplayer|youtube premium|apple music|apple one|microsoft 365|google one|icloud|dropbox|notion|figma|canva|slack|zoom/i, category: "SUBSCRIPTIONS" },

  // Coffee & cafés
  { pattern: /blue tokai|third wave|starbucks|cafe coffee day|\bccd\b|barista|social|flying squirrel|coffee|chai|tea stall|chai point/i, category: "COFFEE_CAFES" },

  // Food & dining
  { pattern: /zomato|swiggy|uber eats|food|pizza|burger|restaurant|dhaba|biryani|hotel|dine|eat|meal|lunch|dinner|breakfast|dominos|kfc|mcdonalds|subway|barbeque|box8|freshmenu|faasos|behrouz|punjabi|chinese|south indian/i, category: "FOOD_DINING" },

  // Transport
  { pattern: /ola|uber|rapido|meru|taxi|auto|cab|metro|bmtc|ktcl|bus|train|irctc|railway|petrol|fuel|indian oil|hp petrol|bharat petroleum|parking|toll/i, category: "TRANSPORT" },

  // Travel
  { pattern: /makemytrip|goibibo|cleartrip|yatra|ixigo|mmt\b|flight|airline|indigo|spicejet|vistara|air india|akasa|hotel|resort|oyo|treebo|fabhotels|booking.com/i, category: "TRAVEL" },

  // Healthcare
  { pattern: /apollo|netmeds|1mg|practo|lybrate|medplus|pharmeasy|healthkart|doctor|hospital|clinic|pharmacy|medicine|medic|health|lab test|blood test|dental|optical/i, category: "HEALTHCARE" },

  // Education
  { pattern: /byju|unacademy|vedantu|coursera|udemy|upgrad|school|college|tuition|coaching|exam|admission|library|course|learning/i, category: "EDUCATION" },

  // Insurance
  { pattern: /insurance|lic\b|policy|premium.*insurance|hdfc life|icici pru|max life|bajaj allianz|star health|niva bupa|acko|policybazaar/i, category: "INSURANCE" },

  // Utilities
  { pattern: /bescom|bwssb|bbmp|electricity|power bill|water bill|gas bill|airtel|jio|vi\b|vodafone|bsnl|broadband|act fibernet|hathway|recharge|mobile bill|landline|internet/i, category: "UTILITIES" },

  // Entertainment
  { pattern: /pvr|inox|bookmyshow|movie|cinema|theatre|concert|event|gaming|steam|playstation|xbox|nintendo/i, category: "ENTERTAINMENT" },

  // Fitness (sub-category of health, but Cult.fit is specific)
  { pattern: /cult.fit|cultfit|curefit|gold.*gym|anytime fitness|fitness/i, category: "HEALTHCARE" },

  // Investments
  { pattern: /zerodha|groww|upstox|kuvera|coin by zerodha|mutual fund|sip|lumpsum|nps|ppf|fd\b|fixed deposit|investment|demat/i, category: "INVESTMENTS" },

  // Banking fees
  { pattern: /annual fee|processing fee|bank charge|gst|service charge|cheque bounce|late fee|emi|loan/i, category: "BANKING_FEES" },

  // Transfers
  { pattern: /transfer|neft|rtgs|imps|upi.*transfer|send money|wallet|paytm|phonepe|gpay|mobikwik|freecharge|bhim/i, category: "TRANSFERS" },

  // Shopping — catch-all after specific ones
  { pattern: /amazon|flipkart|myntra|meesho|nykaa|ajio|tatacliq|snapdeal|shopify|shop|mall|store|retail|cloth|fashion|apparel|footwear|electronics|gadget/i, category: "SHOPPING" },
];

const DEFAULT: CategoryName = "OTHER";

export function tagCategory(normalizedName: string, rawDescription?: string): CategoryName {
  const haystack = [normalizedName, rawDescription ?? ""].join(" ").toLowerCase();
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) return rule.category;
  }
  return DEFAULT;
}
