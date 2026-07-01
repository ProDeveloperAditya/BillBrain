import type { CategoryName } from "@prisma/client";

/**
 * Labeled anchor merchants for the similarity classifier (layer 2 of the
 * categorization cascade). These are real Indian brands — deliberately chosen
 * to cover the *long tail* the regex rules in categoryTagger.ts don't list, so
 * an unseen merchant nearest-neighbors to a labeled example.
 *
 * Keep entries as clean brand names; the embedder handles casing/variants.
 */
export const CATEGORY_ANCHORS: Array<{ name: string; category: CategoryName }> = [
  // Food & dining
  { name: "faasos", category: "FOOD_DINING" },
  { name: "eatfit", category: "FOOD_DINING" },
  { name: "wow momo", category: "FOOD_DINING" },
  { name: "haldiram", category: "FOOD_DINING" },
  { name: "bikanervala", category: "FOOD_DINING" },
  { name: "theobroma", category: "FOOD_DINING" },
  { name: "behrouz biryani", category: "FOOD_DINING" },
  { name: "oven story pizza", category: "FOOD_DINING" },
  { name: "sweet truth", category: "FOOD_DINING" },

  // Groceries
  { name: "spencers retail", category: "GROCERIES" },
  { name: "natures basket", category: "GROCERIES" },
  { name: "licious", category: "GROCERIES" },
  { name: "country delight", category: "GROCERIES" },
  { name: "fresh to home", category: "GROCERIES" },
  { name: "milkbasket", category: "GROCERIES" },
  { name: "otipy", category: "GROCERIES" },

  // Coffee & cafes
  { name: "third wave coffee", category: "COFFEE_CAFES" },
  { name: "abc coffee roasters", category: "COFFEE_CAFES" },
  { name: "tim hortons", category: "COFFEE_CAFES" },
  { name: "chaayos", category: "COFFEE_CAFES" },

  // Transport
  { name: "namma yatri", category: "TRANSPORT" },
  { name: "blusmart", category: "TRANSPORT" },
  { name: "yulu bikes", category: "TRANSPORT" },
  { name: "vogo", category: "TRANSPORT" },
  { name: "fastag recharge", category: "TRANSPORT" },
  { name: "shell petrol", category: "TRANSPORT" },
  { name: "nayara energy fuel", category: "TRANSPORT" },
  { name: "redbus", category: "TRANSPORT" },

  // Travel
  { name: "cleartrip", category: "TRAVEL" },
  { name: "ixigo", category: "TRAVEL" },
  { name: "oyo rooms", category: "TRAVEL" },
  { name: "treebo hotels", category: "TRAVEL" },
  { name: "airbnb", category: "TRAVEL" },
  { name: "akasa air", category: "TRAVEL" },

  // Shopping
  { name: "croma", category: "SHOPPING" },
  { name: "reliance digital", category: "SHOPPING" },
  { name: "decathlon", category: "SHOPPING" },
  { name: "ikea", category: "SHOPPING" },
  { name: "lenskart", category: "SHOPPING" },
  { name: "boat lifestyle", category: "SHOPPING" },
  { name: "vijay sales", category: "SHOPPING" },
  { name: "tira beauty", category: "SHOPPING" },
  { name: "urban company", category: "SHOPPING" },

  // Healthcare
  { name: "tata 1mg", category: "HEALTHCARE" },
  { name: "wellness forever", category: "HEALTHCARE" },
  { name: "dr lal pathlabs", category: "HEALTHCARE" },
  { name: "metropolis labs", category: "HEALTHCARE" },
  { name: "cure fit", category: "HEALTHCARE" },
  { name: "tata neu health", category: "HEALTHCARE" },

  // Utilities
  { name: "tata power", category: "UTILITIES" },
  { name: "adani electricity", category: "UTILITIES" },
  { name: "mahanagar gas", category: "UTILITIES" },
  { name: "act broadband", category: "UTILITIES" },
  { name: "jiofiber", category: "UTILITIES" },
  { name: "tata sky", category: "UTILITIES" },

  // Entertainment
  { name: "pvr inox", category: "ENTERTAINMENT" },
  { name: "district by zomato", category: "ENTERTAINMENT" },
  { name: "wonderla", category: "ENTERTAINMENT" },
  { name: "steam games", category: "ENTERTAINMENT" },

  // Subscriptions
  { name: "jiohotstar", category: "SUBSCRIPTIONS" },
  { name: "sony liv", category: "SUBSCRIPTIONS" },
  { name: "linkedin premium", category: "SUBSCRIPTIONS" },
  { name: "audible", category: "SUBSCRIPTIONS" },
  { name: "chatgpt plus", category: "SUBSCRIPTIONS" },

  // Investments
  { name: "groww", category: "INVESTMENTS" },
  { name: "zerodha kite", category: "INVESTMENTS" },
  { name: "indmoney", category: "INVESTMENTS" },
  { name: "coin dcx", category: "INVESTMENTS" },
  { name: "smallcase", category: "INVESTMENTS" },

  // Education
  { name: "physics wallah", category: "EDUCATION" },
  { name: "great learning", category: "EDUCATION" },
  { name: "scaler academy", category: "EDUCATION" },
  { name: "cuemath", category: "EDUCATION" },

  // Insurance
  { name: "digit insurance", category: "INSURANCE" },
  { name: "hdfc ergo", category: "INSURANCE" },
  { name: "star health insurance", category: "INSURANCE" },

  // Rent / housing
  { name: "nobroker rent", category: "RENT_HOUSING" },
  { name: "nestaway", category: "RENT_HOUSING" },
  { name: "society maintenance", category: "RENT_HOUSING" },
];
