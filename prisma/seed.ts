/**
 * BillBrain AI — Demo seed data
 * Creates one demo user with 4 months of realistic Indian spending history.
 *
 * Run:  npx prisma db seed
 * User: demo@billbrain.ai / demo1234
 */

import {
  PrismaClient,
  TransactionType,
  CategoryName,
  Currency,
  RecurringFrequency,
  InsightType,
  InsightSeverity,
  SpendingGoal,
  AIProvider,
  ParseMethod,
  UploadStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// UTC date helper — month is 1-indexed for readability
const d = (year: number, month: number, day: number, hour = 10): Date =>
  new Date(Date.UTC(year, month - 1, day, hour));

// ─── Types ────────────────────────────────────────────────────────────────────

interface TxInput {
  date: Date;
  amount: number;
  type: TransactionType;
  merchantKey?: string;
  rawDesc: string;
  desc: string;
  category: CategoryName;
  isRecurring?: boolean;
  isFlagged?: boolean;
  isDuplicate?: boolean;
  tags?: string[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding BillBrain demo data…\n");

  // ── Clean existing demo account (cascade deletes everything) ──────────────
  const existing = await prisma.user.findUnique({
    where: { email: "demo@billbrain.ai" },
  });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    console.log("  ↩  Removed previous demo user");
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryMeta: {
    name: CategoryName;
    displayName: string;
    color: string;
    icon: string;
  }[] = [
    { name: CategoryName.FOOD_DINING,    displayName: "Food & Dining",   color: "#f97316", icon: "utensils"          },
    { name: CategoryName.GROCERIES,      displayName: "Groceries",       color: "#84cc16", icon: "shopping-basket"   },
    { name: CategoryName.SUBSCRIPTIONS,  displayName: "Subscriptions",   color: "#8b5cf6", icon: "repeat"            },
    { name: CategoryName.TRANSPORT,      displayName: "Transport",       color: "#06b6d4", icon: "car"               },
    { name: CategoryName.SHOPPING,       displayName: "Shopping",        color: "#f59e0b", icon: "shopping-bag"      },
    { name: CategoryName.HEALTHCARE,     displayName: "Healthcare",      color: "#10b981", icon: "heart-pulse"       },
    { name: CategoryName.EDUCATION,      displayName: "Education",       color: "#3b82f6", icon: "book-open"         },
    { name: CategoryName.SALARY_INCOME,  displayName: "Salary & Income", color: "#22c55e", icon: "banknote"          },
    { name: CategoryName.RENT_HOUSING,   displayName: "Rent & Housing",  color: "#ef4444", icon: "home"              },
    { name: CategoryName.UTILITIES,      displayName: "Utilities",       color: "#64748b", icon: "zap"               },
    { name: CategoryName.ENTERTAINMENT,  displayName: "Entertainment",   color: "#ec4899", icon: "tv"                },
    { name: CategoryName.COFFEE_CAFES,   displayName: "Coffee & Cafés",  color: "#a16207", icon: "coffee"            },
    { name: CategoryName.TRAVEL,         displayName: "Travel",          color: "#0ea5e9", icon: "plane"             },
    { name: CategoryName.INSURANCE,      displayName: "Insurance",       color: "#6366f1", icon: "shield"            },
    { name: CategoryName.BANKING_FEES,   displayName: "Banking Fees",    color: "#9ca3af", icon: "landmark"          },
    { name: CategoryName.TRANSFERS,      displayName: "Transfers",       color: "#6b7280", icon: "arrow-left-right"  },
    { name: CategoryName.INVESTMENTS,    displayName: "Investments",     color: "#14b8a6", icon: "trending-up"       },
    { name: CategoryName.OTHER,          displayName: "Other",           color: "#94a3b8", icon: "more-horizontal"   },
  ];

  for (const cat of categoryMeta) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✓  ${categoryMeta.length} categories`);

  // ── Merchants ──────────────────────────────────────────────────────────────
  const merchantDefs = [
    { rawName: "ZOMATO ORDER",              normalizedName: "Zomato",            category: CategoryName.FOOD_DINING,   isSubscription: false },
    { rawName: "SWIGGY FOOD ORDER",         normalizedName: "Swiggy",            category: CategoryName.FOOD_DINING,   isSubscription: false },
    { rawName: "NETFLIX.COM",               normalizedName: "Netflix",           category: CategoryName.SUBSCRIPTIONS, isSubscription: true  },
    { rawName: "SPOTIFY INDIA PVT LTD",     normalizedName: "Spotify",           category: CategoryName.SUBSCRIPTIONS, isSubscription: true  },
    { rawName: "AMAZON PRIME VIDEO",        normalizedName: "Amazon Prime",      category: CategoryName.SUBSCRIPTIONS, isSubscription: true  },
    { rawName: "DISNEY+ HOTSTAR",           normalizedName: "Disney+ Hotstar",   category: CategoryName.SUBSCRIPTIONS, isSubscription: true  },
    { rawName: "CULT.FIT SUBSCRIPTION",     normalizedName: "Cult.fit",          category: CategoryName.SUBSCRIPTIONS, isSubscription: true  },
    { rawName: "BLINKIT (GROFERS)",         normalizedName: "Blinkit",           category: CategoryName.GROCERIES,     isSubscription: false },
    { rawName: "DUNZO DAILY",               normalizedName: "Dunzo",             category: CategoryName.GROCERIES,     isSubscription: false },
    { rawName: "OLA CABS",                  normalizedName: "Ola",               category: CategoryName.TRANSPORT,     isSubscription: false },
    { rawName: "UBER INDIA",                normalizedName: "Uber",              category: CategoryName.TRANSPORT,     isSubscription: false },
    { rawName: "AMAZON.IN",                 normalizedName: "Amazon",            category: CategoryName.SHOPPING,      isSubscription: false },
    { rawName: "BESCOM ELECTRICITY BILL",   normalizedName: "BESCOM",            category: CategoryName.UTILITIES,     isSubscription: false },
    { rawName: "AIRTEL BROADBAND",          normalizedName: "Airtel Broadband",  category: CategoryName.UTILITIES,     isSubscription: true  },
    { rawName: "BLUE TOKAI COFFEE",         normalizedName: "Blue Tokai Coffee", category: CategoryName.COFFEE_CAFES,  isSubscription: false },
    { rawName: "THIRD WAVE COFFEE",         normalizedName: "Third Wave Coffee", category: CategoryName.COFFEE_CAFES,  isSubscription: false },
    { rawName: "EMPLOYER SALARY NEFT",      normalizedName: "Salary",            category: CategoryName.SALARY_INCOME, isSubscription: false },
    { rawName: "MONTHLY RENT TRANSFER",     normalizedName: "Rent",              category: CategoryName.RENT_HOUSING,  isSubscription: false },
  ];

  const merchants: Record<string, { id: string }> = {};
  for (const m of merchantDefs) {
    const rec = await prisma.merchant.upsert({
      where:  { normalizedName: m.normalizedName },
      update: {},
      create: m,
    });
    merchants[m.normalizedName] = rec;
  }
  console.log(`  ✓  ${merchantDefs.length} merchants`);

  // ── Demo user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const user = await prisma.user.create({
    data: {
      email: "demo@billbrain.ai",
      name: "Aditya Raj",
      password: passwordHash,
      profile: {
        create: {
          currency: Currency.INR,
          locale: "en-IN",
          monthlyIncomeRange: "50000-100000",
          spendingGoal: SpendingGoal.CUT_SUBSCRIPTIONS,
          preferredAiProvider: AIProvider.DEMO,
          demoMode: true,
          onboardingCompleted: true,
        },
      },
    },
  });
  const uid = user.id;
  console.log(`  ✓  Demo user: ${user.email}`);

  // ── Demo upload file (represents imported bank statement CSV) ──────────────
  const demoFile = await prisma.uploadedFile.create({
    data: {
      userId: uid,
      filename: "HDFC_Statement_Jan_Apr_2026.csv",
      mimeType: "text/csv",
      size: 52480,
      parseMethod: ParseMethod.CSV,
      status: UploadStatus.DONE,
      recordCount: 164,
      checksum: "a1b2c3d4e5f67890abcdef1234567890abcdef12",
    },
  });

  // ── Build transaction list ─────────────────────────────────────────────────
  const txInputs: TxInput[] = [];

  const food  = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.FOOD_DINING, ...t });
  const coffee = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.COFFEE_CAFES, ...t });
  const grocery = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.GROCERIES, ...t });
  const ride = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.TRANSPORT, ...t });
  const sub = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.SUBSCRIPTIONS, isRecurring: true, ...t });
  const shop = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.SHOPPING, ...t });
  const util = (t: Omit<TxInput, "type" | "category">) =>
    txInputs.push({ type: TransactionType.DEBIT, category: CategoryName.UTILITIES, ...t });

  // ───────────────────────────────────────────────────────────────────────────
  // JANUARY 2026
  // ───────────────────────────────────────────────────────────────────────────

  // Salary + rent
  txInputs.push({ date: d(2026,1,1,9),   amount: 75000, type: TransactionType.CREDIT, merchantKey: "Salary",           rawDesc: "NEFT CR EMPLOYER SALARY JAN 2026",       desc: "Salary — January 2026",             category: CategoryName.SALARY_INCOME, isRecurring: true, tags: ["salary","income"] });
  txInputs.push({ date: d(2026,1,5,11),  amount: 18000, type: TransactionType.DEBIT,  merchantKey: "Rent",             rawDesc: "UPI/RENT/LANDLORD KORAMANGALA JAN",      desc: "Rent — January 2026",               category: CategoryName.RENT_HOUSING,  isRecurring: true, tags: ["rent"] });

  // Subscriptions
  sub({ date: d(2026,1,7,10),   amount: 499,  merchantKey: "Netflix",          rawDesc: "NETFLIX.COM SUBSCRIPTION",         desc: "Netflix Monthly",                  tags: ["streaming","subscription"] });
  sub({ date: d(2026,1,8,10),   amount: 119,  merchantKey: "Spotify",          rawDesc: "SPOTIFY INDIA PREMIUM",            desc: "Spotify Premium",                  tags: ["music","subscription"] });
  sub({ date: d(2026,1,10,10),  amount: 299,  merchantKey: "Amazon Prime",     rawDesc: "AMAZON PRIME MEMBERSHIP",          desc: "Amazon Prime Monthly",             tags: ["streaming","subscription"] });
  sub({ date: d(2026,1,12,10),  amount: 299,  merchantKey: "Disney+ Hotstar",  rawDesc: "DISNEY+ HOTSTAR PREMIUM",          desc: "Disney+ Hotstar",                  tags: ["streaming","subscription"] });
  sub({ date: d(2026,1,15,10),  amount: 899,  merchantKey: "Cult.fit",         rawDesc: "CULT.FIT MONTHLY SUBSCRIPTION",    desc: "Cult.fit Fitness Plan",            isFlagged: true, tags: ["fitness","subscription","dormant"] });

  // Utilities
  util({ date: d(2026,1,14,11), amount: 2450, merchantKey: "BESCOM",           rawDesc: "BESCOM ELECTRICITY BILL JAN 2026", desc: "Electricity — January",            tags: ["utilities","electricity"] });
  util({ date: d(2026,1,18,11), amount: 999,  merchantKey: "Airtel Broadband", rawDesc: "AIRTEL BROADBAND JAN 2026",        desc: "Airtel Broadband — January",       isRecurring: true, tags: ["internet","utilities"] });

  // Food delivery (mix of day + late-night — late-night flagged)
  food({ date: d(2026,1,3,13),  amount: 385, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8472",  desc: "Zomato — Lunch",             tags: ["food","delivery"] });
  food({ date: d(2026,1,6,23),  amount: 520, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8501",  desc: "Zomato — Late Night",        isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,1,9,22),  amount: 285, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2201", desc: "Swiggy — Late Night",        isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,1,11,13), amount: 420, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8534",  desc: "Zomato — Lunch",             tags: ["food","delivery"] });
  food({ date: d(2026,1,14,20), amount: 310, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2245", desc: "Swiggy — Dinner",            tags: ["food","delivery"] });
  food({ date: d(2026,1,16,23), amount: 640, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8601",  desc: "Zomato — Late Night Binge",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,1,19,13), amount: 245, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2312", desc: "Swiggy — Lunch",             tags: ["food","delivery"] });
  food({ date: d(2026,1,22,22), amount: 455, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8643",  desc: "Zomato — Late Night",        isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,1,25,13), amount: 290, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2389", desc: "Swiggy — Lunch",             tags: ["food","delivery"] });
  food({ date: d(2026,1,28,20), amount: 375, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z8701",  desc: "Zomato — Dinner",            tags: ["food","delivery"] });
  food({ date: d(2026,1,30,23), amount: 505, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2441", desc: "Swiggy — Late Night",        isFlagged: true, tags: ["food","delivery","late-night"] });

  // Grocery / convenience
  grocery({ date: d(2026,1,4,17),  amount: 720, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1122", desc: "Blinkit — Groceries",       tags: ["groceries","convenience"] });
  grocery({ date: d(2026,1,11,18), amount: 340, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ4421",   desc: "Dunzo — Essentials",        tags: ["groceries","convenience"] });
  grocery({ date: d(2026,1,19,19), amount: 890, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1198", desc: "Blinkit — Weekly Stock",    tags: ["groceries","convenience"] });
  grocery({ date: d(2026,1,26,17), amount: 215, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ4512",   desc: "Dunzo — Quick Delivery",    tags: ["groceries","convenience"] });

  // Transport
  ride({ date: d(2026,1,3,9),   amount: 145, merchantKey: "Ola",   rawDesc: "OLA RIDE #OL8821",   desc: "Ola — Morning Commute",  tags: ["transport","ride"] });
  ride({ date: d(2026,1,8,19),  amount: 245, merchantKey: "Uber",  rawDesc: "UBER TRIP #UB3341",  desc: "Uber — Evening",         tags: ["transport","ride"] });
  ride({ date: d(2026,1,15,9),  amount: 180, merchantKey: "Ola",   rawDesc: "OLA RIDE #OL8904",   desc: "Ola — Commute",          tags: ["transport","ride"] });
  ride({ date: d(2026,1,21,20), amount: 380, merchantKey: "Uber",  rawDesc: "UBER TRIP #UB3412",  desc: "Uber — Night Ride",      tags: ["transport","ride"] });
  ride({ date: d(2026,1,27,9),  amount: 160, merchantKey: "Ola",   rawDesc: "OLA RIDE #OL8987",   desc: "Ola — Morning",          tags: ["transport","ride"] });

  // Shopping (impulse)
  shop({ date: d(2026,1,7,15),  amount: 1299, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-1122334", desc: "Amazon — Book Bundle",       tags: ["shopping"] });
  shop({ date: d(2026,1,13,16), amount: 2499, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-1144221", desc: "Amazon — Headphones",        isFlagged: true, tags: ["shopping","impulse","electronics"] });
  shop({ date: d(2026,1,24,14), amount: 699,  merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-1156789", desc: "Amazon — Kitchen Items",     tags: ["shopping"] });

  // Coffee (3–4×/week = ~14/month)
  coffee({ date: d(2026,1,2,9),   amount: 280, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,1,4,10),  amount: 320, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,6,9),   amount: 260, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,8,9),   amount: 280, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,1,10,10), amount: 340, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee & Snack", tags: ["coffee"] });
  coffee({ date: d(2026,1,13,9),  amount: 260, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,15,10), amount: 300, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,17,9),  amount: 280, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,1,20,9),  amount: 260, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,22,10), amount: 300, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,24,9),  amount: 280, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,27,9),  amount: 260, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,1,29,10), amount: 300, merchantKey: "Blue Tokai Coffee",  rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,1,31,9),  amount: 280, merchantKey: "Third Wave Coffee",  rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Morning", tags: ["coffee"] });

  // ───────────────────────────────────────────────────────────────────────────
  // FEBRUARY 2026  (duplicate payment in this month)
  // ───────────────────────────────────────────────────────────────────────────

  txInputs.push({ date: d(2026,2,1,9),  amount: 75000, type: TransactionType.CREDIT, merchantKey: "Salary", rawDesc: "NEFT CR EMPLOYER SALARY FEB 2026",  desc: "Salary — February 2026", category: CategoryName.SALARY_INCOME, isRecurring: true, tags: ["salary","income"] });
  txInputs.push({ date: d(2026,2,5,11), amount: 18000, type: TransactionType.DEBIT,  merchantKey: "Rent",   rawDesc: "UPI/RENT/LANDLORD KORAMANGALA FEB", desc: "Rent — February 2026",   category: CategoryName.RENT_HOUSING,  isRecurring: true, tags: ["rent"] });

  sub({ date: d(2026,2,7,10),  amount: 499,  merchantKey: "Netflix",          rawDesc: "NETFLIX.COM SUBSCRIPTION",         desc: "Netflix Monthly",              tags: ["streaming","subscription"] });
  sub({ date: d(2026,2,8,10),  amount: 119,  merchantKey: "Spotify",          rawDesc: "SPOTIFY INDIA PREMIUM",            desc: "Spotify Premium",              tags: ["music","subscription"] });
  sub({ date: d(2026,2,10,10), amount: 299,  merchantKey: "Amazon Prime",     rawDesc: "AMAZON PRIME MEMBERSHIP",          desc: "Amazon Prime Monthly",         tags: ["streaming","subscription"] });
  sub({ date: d(2026,2,12,10), amount: 299,  merchantKey: "Disney+ Hotstar",  rawDesc: "DISNEY+ HOTSTAR PREMIUM",          desc: "Disney+ Hotstar",              tags: ["streaming","subscription"] });
  sub({ date: d(2026,2,15,10), amount: 899,  merchantKey: "Cult.fit",         rawDesc: "CULT.FIT MONTHLY SUBSCRIPTION",    desc: "Cult.fit Fitness Plan",        isFlagged: true, tags: ["fitness","subscription","dormant"] });

  util({ date: d(2026,2,14,11), amount: 2180, merchantKey: "BESCOM",           rawDesc: "BESCOM ELECTRICITY BILL FEB 2026", desc: "Electricity — February",      tags: ["utilities","electricity"] });
  util({ date: d(2026,2,18,11), amount: 999,  merchantKey: "Airtel Broadband", rawDesc: "AIRTEL BROADBAND FEB 2026",        desc: "Airtel Broadband — February", isRecurring: true, tags: ["internet","utilities"] });

  food({ date: d(2026,2,2,13),  amount: 340, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9012",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,2,5,23),  amount: 580, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2801", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,2,7,13),  amount: 310, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9045",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  // ★ Duplicate charge — same order charged twice
  food({ date: d(2026,2,9,22),  amount: 450, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2845", desc: "Swiggy — Late Night",  isFlagged: true,  tags: ["food","delivery","late-night"] });
  food({ date: d(2026,2,9,22),  amount: 450, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2845", desc: "Swiggy — DUPLICATE CHARGE", isDuplicate: true, isFlagged: true, tags: ["food","delivery","duplicate"] });
  food({ date: d(2026,2,12,13), amount: 275, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9112",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,2,14,23), amount: 620, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9145",  desc: "Zomato — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,2,17,13), amount: 395, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2901", desc: "Swiggy — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,2,20,22), amount: 510, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9201",  desc: "Zomato — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,2,23,13), amount: 295, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW2956", desc: "Swiggy — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,2,25,20), amount: 415, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9245",  desc: "Zomato — Dinner",      tags: ["food","delivery"] });
  food({ date: d(2026,2,27,23), amount: 535, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3012", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });

  grocery({ date: d(2026,2,3,18),  amount: 580, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1345", desc: "Blinkit — Groceries",    tags: ["groceries","convenience"] });
  grocery({ date: d(2026,2,10,19), amount: 425, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ4890",   desc: "Dunzo — Essentials",     tags: ["groceries","convenience"] });
  grocery({ date: d(2026,2,18,17), amount: 780, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1412", desc: "Blinkit — Weekly Stock", tags: ["groceries","convenience"] });
  grocery({ date: d(2026,2,24,18), amount: 290, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ4967",   desc: "Dunzo — Quick Delivery", tags: ["groceries","convenience"] });

  ride({ date: d(2026,2,4,9),   amount: 165, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL9201",  desc: "Ola — Commute",      tags: ["transport","ride"] });
  ride({ date: d(2026,2,10,20), amount: 280, merchantKey: "Uber", rawDesc: "UBER TRIP #UB3812", desc: "Uber — Evening",     tags: ["transport","ride"] });
  ride({ date: d(2026,2,16,9),  amount: 185, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL9278",  desc: "Ola — Morning",      tags: ["transport","ride"] });
  ride({ date: d(2026,2,22,21), amount: 345, merchantKey: "Uber", rawDesc: "UBER TRIP #UB3889", desc: "Uber — Night Ride",  tags: ["transport","ride"] });

  // Feb — Amazon impulse spike (3× January)
  shop({ date: d(2026,2,9,15),  amount: 3299, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-2233445", desc: "Amazon — Bluetooth Speaker",  isFlagged: true, tags: ["shopping","impulse","electronics"] });
  shop({ date: d(2026,2,16,14), amount: 899,  merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-2244556", desc: "Amazon — Kitchen Supplies",   tags: ["shopping"] });
  shop({ date: d(2026,2,23,16), amount: 1499, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-2256789", desc: "Amazon — Desk Accessories",   isFlagged: true, tags: ["shopping","impulse"] });
  shop({ date: d(2026,2,27,15), amount: 499,  merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-2267890", desc: "Amazon — USB Cables",         tags: ["shopping"] });

  coffee({ date: d(2026,2,2,9),   amount: 280, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,2,4,10),  amount: 320, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,6,9),   amount: 260, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,9,9),   amount: 300, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,2,11,10), amount: 280, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,13,9),  amount: 340, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,16,10), amount: 260, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,18,9),  amount: 280, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,2,20,9),  amount: 300, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,23,10), amount: 280, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,25,9),  amount: 320, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,2,27,9),  amount: 260, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });

  // ───────────────────────────────────────────────────────────────────────────
  // MARCH 2026  (Netflix price increase ₹499 → ₹649)
  // ───────────────────────────────────────────────────────────────────────────

  txInputs.push({ date: d(2026,3,1,9),  amount: 75000, type: TransactionType.CREDIT, merchantKey: "Salary", rawDesc: "NEFT CR EMPLOYER SALARY MAR 2026",  desc: "Salary — March 2026", category: CategoryName.SALARY_INCOME, isRecurring: true, tags: ["salary","income"] });
  txInputs.push({ date: d(2026,3,5,11), amount: 18000, type: TransactionType.DEBIT,  merchantKey: "Rent",   rawDesc: "UPI/RENT/LANDLORD KORAMANGALA MAR", desc: "Rent — March 2026",   category: CategoryName.RENT_HOUSING,  isRecurring: true, tags: ["rent"] });

  // ★ Netflix price hike — flagged
  sub({ date: d(2026,3,7,10),  amount: 649,  merchantKey: "Netflix",          rawDesc: "NETFLIX.COM SUBSCRIPTION",         desc: "Netflix Monthly (Price Increased ₹499→₹649)", isFlagged: true, tags: ["streaming","subscription","price-increase"] });
  sub({ date: d(2026,3,8,10),  amount: 119,  merchantKey: "Spotify",          rawDesc: "SPOTIFY INDIA PREMIUM",            desc: "Spotify Premium",              tags: ["music","subscription"] });
  sub({ date: d(2026,3,10,10), amount: 299,  merchantKey: "Amazon Prime",     rawDesc: "AMAZON PRIME MEMBERSHIP",          desc: "Amazon Prime Monthly",         tags: ["streaming","subscription"] });
  sub({ date: d(2026,3,12,10), amount: 299,  merchantKey: "Disney+ Hotstar",  rawDesc: "DISNEY+ HOTSTAR PREMIUM",          desc: "Disney+ Hotstar",              tags: ["streaming","subscription"] });
  sub({ date: d(2026,3,15,10), amount: 899,  merchantKey: "Cult.fit",         rawDesc: "CULT.FIT MONTHLY SUBSCRIPTION",    desc: "Cult.fit Fitness Plan",        isFlagged: true, tags: ["fitness","subscription","dormant"] });

  util({ date: d(2026,3,14,11), amount: 2810, merchantKey: "BESCOM",           rawDesc: "BESCOM ELECTRICITY BILL MAR 2026", desc: "Electricity — March",         tags: ["utilities","electricity"] });
  util({ date: d(2026,3,18,11), amount: 999,  merchantKey: "Airtel Broadband", rawDesc: "AIRTEL BROADBAND MAR 2026",        desc: "Airtel Broadband — March",    isRecurring: true, tags: ["internet","utilities"] });

  food({ date: d(2026,3,3,13),  amount: 365, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9801",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,3,6,23),  amount: 555, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3401", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,3,9,13),  amount: 295, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9834",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,3,11,22), amount: 480, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3445", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,3,14,13), amount: 335, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9878",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,3,17,23), amount: 615, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9912",  desc: "Zomato — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,3,19,13), amount: 250, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3489", desc: "Swiggy — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,3,22,22), amount: 490, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z9956",  desc: "Zomato — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,3,25,13), amount: 320, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3534", desc: "Swiggy — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,3,28,20), amount: 380, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z0012",  desc: "Zomato — Dinner",      tags: ["food","delivery"] });

  grocery({ date: d(2026,3,4,18),  amount: 650, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1678", desc: "Blinkit — Groceries",      tags: ["groceries","convenience"] });
  grocery({ date: d(2026,3,12,19), amount: 380, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ5234",   desc: "Dunzo — Essentials",       tags: ["groceries","convenience"] });
  grocery({ date: d(2026,3,21,17), amount: 820, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL1745", desc: "Blinkit — Monthly Stock",  tags: ["groceries","convenience"] });
  grocery({ date: d(2026,3,28,18), amount: 245, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ5301",   desc: "Dunzo — Quick Delivery",   tags: ["groceries","convenience"] });

  ride({ date: d(2026,3,5,9),   amount: 155, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL9812",  desc: "Ola — Commute",     tags: ["transport","ride"] });
  ride({ date: d(2026,3,11,20), amount: 290, merchantKey: "Uber", rawDesc: "UBER TRIP #UB4312", desc: "Uber — Evening",    tags: ["transport","ride"] });
  ride({ date: d(2026,3,18,9),  amount: 175, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL9889",  desc: "Ola — Morning",     tags: ["transport","ride"] });
  ride({ date: d(2026,3,24,21), amount: 360, merchantKey: "Uber", rawDesc: "UBER TRIP #UB4389", desc: "Uber — Night Ride", tags: ["transport","ride"] });
  ride({ date: d(2026,3,30,9),  amount: 140, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL9956",  desc: "Ola — Morning",     tags: ["transport","ride"] });

  shop({ date: d(2026,3,8,15),  amount: 1899, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-3344556", desc: "Amazon — Yoga Mat",      tags: ["shopping"] });
  shop({ date: d(2026,3,19,14), amount: 599,  merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-3356789", desc: "Amazon — Water Bottle",  tags: ["shopping"] });

  coffee({ date: d(2026,3,2,9),   amount: 290, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,3,4,10),  amount: 320, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,6,9),   amount: 270, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,9,9),   amount: 300, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,3,11,10), amount: 350, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee & Snack", tags: ["coffee"] });
  coffee({ date: d(2026,3,13,9),  amount: 280, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,16,10), amount: 260, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,18,9),  amount: 300, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,3,20,9),  amount: 290, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,23,10), amount: 260, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,25,9),  amount: 320, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,3,27,9),  amount: 280, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,3,30,10), amount: 300, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });

  // ───────────────────────────────────────────────────────────────────────────
  // APRIL 2026  (partial — up to 20th)
  // ───────────────────────────────────────────────────────────────────────────

  txInputs.push({ date: d(2026,4,1,9),  amount: 75000, type: TransactionType.CREDIT, merchantKey: "Salary", rawDesc: "NEFT CR EMPLOYER SALARY APR 2026",  desc: "Salary — April 2026", category: CategoryName.SALARY_INCOME, isRecurring: true, tags: ["salary","income"] });
  txInputs.push({ date: d(2026,4,5,11), amount: 18000, type: TransactionType.DEBIT,  merchantKey: "Rent",   rawDesc: "UPI/RENT/LANDLORD KORAMANGALA APR", desc: "Rent — April 2026",   category: CategoryName.RENT_HOUSING,  isRecurring: true, tags: ["rent"] });

  sub({ date: d(2026,4,7,10),  amount: 649, merchantKey: "Netflix",          rawDesc: "NETFLIX.COM SUBSCRIPTION",         desc: "Netflix Monthly",          tags: ["streaming","subscription"] });
  sub({ date: d(2026,4,8,10),  amount: 119, merchantKey: "Spotify",          rawDesc: "SPOTIFY INDIA PREMIUM",            desc: "Spotify Premium",          tags: ["music","subscription"] });
  sub({ date: d(2026,4,10,10), amount: 299, merchantKey: "Amazon Prime",     rawDesc: "AMAZON PRIME MEMBERSHIP",          desc: "Amazon Prime Monthly",     tags: ["streaming","subscription"] });
  sub({ date: d(2026,4,12,10), amount: 299, merchantKey: "Disney+ Hotstar",  rawDesc: "DISNEY+ HOTSTAR PREMIUM",          desc: "Disney+ Hotstar",          tags: ["streaming","subscription"] });
  sub({ date: d(2026,4,15,10), amount: 899, merchantKey: "Cult.fit",         rawDesc: "CULT.FIT MONTHLY SUBSCRIPTION",    desc: "Cult.fit Fitness Plan",    isFlagged: true, tags: ["fitness","subscription","dormant"] });

  util({ date: d(2026,4,14,11), amount: 2650, merchantKey: "BESCOM",           rawDesc: "BESCOM ELECTRICITY BILL APR 2026", desc: "Electricity — April",      tags: ["utilities","electricity"] });
  util({ date: d(2026,4,18,11), amount: 999,  merchantKey: "Airtel Broadband", rawDesc: "AIRTEL BROADBAND APR 2026",        desc: "Airtel Broadband — April", isRecurring: true, tags: ["internet","utilities"] });

  food({ date: d(2026,4,3,13),  amount: 345, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z0234",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,4,5,23),  amount: 570, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3901", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,4,8,13),  amount: 310, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z0267",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,4,11,22), amount: 450, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3945", desc: "Swiggy — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,4,14,13), amount: 285, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z0312",  desc: "Zomato — Lunch",       tags: ["food","delivery"] });
  food({ date: d(2026,4,17,23), amount: 535, merchantKey: "Zomato",  rawDesc: "ZOMATO ORDER #Z0345",  desc: "Zomato — Late Night",  isFlagged: true, tags: ["food","delivery","late-night"] });
  food({ date: d(2026,4,20,13), amount: 295, merchantKey: "Swiggy",  rawDesc: "SWIGGY ORDER #SW3989", desc: "Swiggy — Lunch",       tags: ["food","delivery"] });

  grocery({ date: d(2026,4,6,18),  amount: 690, merchantKey: "Blinkit", rawDesc: "BLINKIT ORDER #BL2012", desc: "Blinkit — Groceries", tags: ["groceries","convenience"] });
  grocery({ date: d(2026,4,16,19), amount: 410, merchantKey: "Dunzo",   rawDesc: "DUNZO ORDER #DZ5678",   desc: "Dunzo — Essentials",  tags: ["groceries","convenience"] });

  ride({ date: d(2026,4,4,9),   amount: 155, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL0234",  desc: "Ola — Commute",     tags: ["transport","ride"] });
  ride({ date: d(2026,4,12,20), amount: 310, merchantKey: "Uber", rawDesc: "UBER TRIP #UB4912", desc: "Uber — Evening",    tags: ["transport","ride"] });
  ride({ date: d(2026,4,19,9),  amount: 175, merchantKey: "Ola",  rawDesc: "OLA RIDE #OL0312",  desc: "Ola — Morning",     tags: ["transport","ride"] });

  shop({ date: d(2026,4,10,15), amount: 2199, merchantKey: "Amazon", rawDesc: "AMAZON.IN #AMZ-4455667", desc: "Amazon — Fitness Gear", isFlagged: true, tags: ["shopping","impulse"] });

  coffee({ date: d(2026,4,2,9),   amount: 290, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,4,4,10),  amount: 300, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,4,7,9),   amount: 280, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,4,9,10),  amount: 320, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,4,11,9),  amount: 260, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,4,14,9),  amount: 300, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE INDIRANAGAR",  desc: "Third Wave — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,4,16,10), amount: 280, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });
  coffee({ date: d(2026,4,18,9),  amount: 320, merchantKey: "Third Wave Coffee", rawDesc: "THIRD WAVE COFFEE HSR LAYOUT",  desc: "Third Wave — Morning", tags: ["coffee"] });
  coffee({ date: d(2026,4,20,9),  amount: 290, merchantKey: "Blue Tokai Coffee", rawDesc: "BLUE TOKAI COFFEE KORAMANGALA", desc: "Blue Tokai — Coffee",  tags: ["coffee"] });

  // ── Persist transactions ───────────────────────────────────────────────────
  const createdTxs: { id: string; date: Date; amount: number; normalizedMerchant: string | null }[] = [];
  for (const tx of txInputs) {
    const merchantId = tx.merchantKey ? merchants[tx.merchantKey]?.id ?? null : null;
    const rec = await prisma.transaction.create({
      data: {
        userId:            uid,
        merchantId,
        sourceFileId:      demoFile.id,
        date:              tx.date,
        amount:            tx.amount,
        currency:          Currency.INR,
        type:              tx.type,
        rawDescription:    tx.rawDesc,
        description:       tx.desc,
        category:          tx.category,
        isRecurring:       tx.isRecurring  ?? false,
        isFlagged:         tx.isFlagged    ?? false,
        isDuplicate:       tx.isDuplicate  ?? false,
        tags:              tx.tags         ?? [],
        confidence:        1.0,
        normalizedMerchant: tx.merchantKey ?? null,
      },
    });
    createdTxs.push({ id: rec.id, date: rec.date, amount: Number(rec.amount), normalizedMerchant: rec.normalizedMerchant });
  }
  console.log(`  ✓  ${createdTxs.length} transactions`);

  // ── RecurringCharges ───────────────────────────────────────────────────────
  const rcRecords = await prisma.recurringCharge.createManyAndReturn({
    data: [
      {
        userId:             uid,
        merchantId:         merchants["Netflix"].id,
        merchantName:       "Netflix",
        normalizedName:     "Netflix",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      532,   // avg across ₹499 (×2 months) + ₹649 (×2 months)
        amountVariance:     75,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,7),
        lastChargedDate:    d(2026,4,7),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 7)),
        confidenceScore:    0.99,
        annualCost:         7188,
        isPossiblyForgotten: false,
        notes: "Price increased from ₹499 to ₹649 in March 2026",
      },
      {
        userId:             uid,
        merchantId:         merchants["Spotify"].id,
        merchantName:       "Spotify",
        normalizedName:     "Spotify",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      119,
        amountVariance:     0,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,8),
        lastChargedDate:    d(2026,4,8),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 8)),
        confidenceScore:    0.99,
        annualCost:         1428,
        isPossiblyForgotten: false,
      },
      {
        userId:             uid,
        merchantId:         merchants["Amazon Prime"].id,
        merchantName:       "Amazon Prime",
        normalizedName:     "Amazon Prime",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      299,
        amountVariance:     0,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,10),
        lastChargedDate:    d(2026,4,10),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 10)),
        confidenceScore:    0.99,
        annualCost:         3588,
        isPossiblyForgotten: false,
      },
      {
        userId:             uid,
        merchantId:         merchants["Disney+ Hotstar"].id,
        merchantName:       "Disney+ Hotstar",
        normalizedName:     "Disney+ Hotstar",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      299,
        amountVariance:     0,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,12),
        lastChargedDate:    d(2026,4,12),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 12)),
        confidenceScore:    0.98,
        annualCost:         3588,
        isPossiblyForgotten: false,
      },
      {
        // ★ Forgotten subscription — never used
        userId:             uid,
        merchantId:         merchants["Cult.fit"].id,
        merchantName:       "Cult.fit",
        normalizedName:     "Cult.fit",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      899,
        amountVariance:     0,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,15),
        lastChargedDate:    d(2026,4,15),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 15)),
        confidenceScore:    0.99,
        annualCost:         10788,
        isPossiblyForgotten: true,
        notes: "No app usage detected in 4 months. Likely a forgotten subscription.",
      },
      {
        userId:             uid,
        merchantId:         merchants["Airtel Broadband"].id,
        merchantName:       "Airtel Broadband",
        normalizedName:     "Airtel Broadband",
        frequency:          RecurringFrequency.MONTHLY,
        averageAmount:      999,
        amountVariance:     0,
        currency:           Currency.INR,
        firstSeenDate:      d(2026,1,18),
        lastChargedDate:    d(2026,4,18),
        estimatedNextDate:  new Date(Date.UTC(2026, 4, 18)),
        confidenceScore:    0.97,
        annualCost:         11988,
        isPossiblyForgotten: false,
      },
    ],
  });
  console.log(`  ✓  ${rcRecords.length} recurring charges`);

  // ── SubscriptionSignals (confirmed links between txs and recurring charges) ─
  const rcByName = Object.fromEntries(rcRecords.map((r) => [r.normalizedName, r]));

  const signalMerchants = ["Netflix", "Cult.fit", "Spotify", "Amazon Prime", "Disney+ Hotstar", "Airtel Broadband"];
  let signalCount = 0;

  for (const name of signalMerchants) {
    const rc = rcByName[name];
    if (!rc) continue;
    const matchingTxs = createdTxs.filter((t) => t.normalizedMerchant === name);
    for (const tx of matchingTxs) {
      await prisma.subscriptionSignal.create({
        data: {
          userId:           uid,
          transactionId:    tx.id,
          recurringChargeId: rc.id,
          merchantName:     name,
          normalizedName:   name,
          amount:           tx.amount,
          currency:         Currency.INR,
          signalDate:       tx.date,
          frequency:        RecurringFrequency.MONTHLY,
          isConfirmed:      true,
          confidence:       rc.confidenceScore,
        },
      });
      signalCount++;
    }
  }
  console.log(`  ✓  ${signalCount} subscription signals`);

  // ── Insights ───────────────────────────────────────────────────────────────
  const insights = await prisma.insight.createManyAndReturn({
    data: [
      {
        userId:      uid,
        type:        InsightType.LEAK,
        severity:    InsightSeverity.HIGH,
        title:       "Late-night food delivery is costing you ₹74,400/year",
        body:        "You placed 19 food orders between 10 PM and 2 AM across the last 4 months, totalling ₹20,145. That's 36% of all food delivery spend happening during late-night hours when impulse ordering is highest. At this rate you're on track to spend ₹74,400 annually on late-night deliveries alone — more than you spend on rent in 4 months.",
        data:        { annualizedWaste: 74400, lateNightOrders: 19, averageOrderValue: 521, topMerchants: ["Zomato", "Swiggy"] },
        isRead:      false,
        generatedAt: d(2026,4,21),
      },
      {
        userId:      uid,
        type:        InsightType.SUBSCRIPTION_ALERT,
        severity:    InsightSeverity.HIGH,
        title:       "Cult.fit — ₹3,596 charged for a gym you haven't opened",
        body:        "Cult.fit has silently billed you ₹899/month for 4 consecutive months (₹3,596 total) with no detected app activity. You're currently paying ₹2,266/month for 4 streaming platforms — and ₹899/month more for a fitness subscription you never use. Cancelling Cult.fit alone would save ₹10,788/year.",
        data:        { monthlyAmount: 899, monthsCharged: 4, totalCharged: 3596, annualSaving: 10788, merchant: "Cult.fit", isPossiblyForgotten: true },
        isRead:      false,
        generatedAt: d(2026,4,21),
      },
      {
        userId:      uid,
        type:        InsightType.DUPLICATE_CHARGE,
        severity:    InsightSeverity.MEDIUM,
        title:       "Swiggy charged you ₹450 twice on Feb 9 — likely a duplicate",
        body:        "On February 9th, Swiggy debited ₹450 from your account twice within the same minute for order #SW2845. This is a textbook duplicate transaction — the same order ID, amount, and timestamp appearing twice. Contact Swiggy support or raise a dispute with your bank to recover ₹450.",
        data:        { duplicateAmount: 450, date: "2026-02-09", orderId: "SW2845", merchant: "Swiggy", refundable: true },
        isRead:      false,
        generatedAt: d(2026,4,21),
      },
      {
        userId:      uid,
        type:        InsightType.CATEGORY_SPIKE,
        severity:    InsightSeverity.MEDIUM,
        title:       "You spend ₹45,600/year just on coffee",
        body:        "Your café spending has been rock-steady at 3–4 visits per week, averaging ₹3,800/month split between Blue Tokai Coffee and Third Wave Coffee. That's ₹45,600/year — more than you spend on all your streaming subscriptions combined. A quality home espresso setup (₹8,000–₹12,000 one-time) would break even in under 4 months.",
        data:        { monthlyAverage: 3800, annualTotal: 45600, visitsPerWeek: 3.5, topMerchants: ["Blue Tokai Coffee", "Third Wave Coffee"] },
        isRead:      false,
        generatedAt: d(2026,4,21),
      },
      {
        userId:      uid,
        type:        InsightType.SAVINGS_OPPORTUNITY,
        severity:    InsightSeverity.MEDIUM,
        title:       "3 streaming platforms, ₹14,964/year — one too many?",
        body:        "You're holding Netflix (₹649), Amazon Prime (₹299), and Disney+ Hotstar (₹299) simultaneously — ₹1,247/month or ₹14,964/year on OTT alone. Rotating subscriptions every 2–3 months instead of holding all three would save ₹7,000–₹9,000/year with minimal disruption to your watching habits.",
        data:        { totalMonthly: 1247, totalAnnual: 14964, subscriptions: ["Netflix", "Amazon Prime", "Disney+ Hotstar"], potentialSaving: 8000 },
        isRead:      false,
        generatedAt: d(2026,4,21),
      },
      {
        userId:      uid,
        type:        InsightType.ANOMALY,
        severity:    InsightSeverity.LOW,
        title:       "Amazon impulse spend spiked 3× in February",
        body:        "Your Amazon purchases in February totalled ₹6,196 — 3.1× higher than January (₹4,497) and March (₹2,498). The spike was driven by a Bluetooth speaker (₹3,299) and desk accessories (₹1,499) in the same mid-month window. The pattern suggests mid-month impulse buying when salary is still fresh.",
        data:        { febSpend: 6196, janSpend: 4497, marSpend: 2498, spikeMultiple: 3.1, merchant: "Amazon" },
        isRead:      true,
        generatedAt: d(2026,4,1),
      },
    ],
  });
  console.log(`  ✓  ${insights.length} insights`);

  // ── SpendingSnapshots ──────────────────────────────────────────────────────
  // Aggregate totals from the txInputs array (computed, not hardcoded)
  function monthlyStats(monthIndex: number) { // 0=Jan, 1=Feb, 2=Mar, 3=Apr
    const debits  = txInputs.filter((t) => t.date.getUTCMonth() === monthIndex && t.type === TransactionType.DEBIT);
    const credits = txInputs.filter((t) => t.date.getUTCMonth() === monthIndex && t.type === TransactionType.CREDIT);

    const sum = (arr: TxInput[]) => arr.reduce((s, t) => s + t.amount, 0);
    const catSum = (cat: CategoryName) => sum(debits.filter((t) => t.category === cat));
    const catCount = (cat: CategoryName) => debits.filter((t) => t.category === cat).length;

    const totalSpend  = sum(debits);
    const totalCredit = sum(credits);

    return { debits, totalSpend, totalCredit, catSum, catCount };
  }

  const monthDefs = [
    { utcMonth: 0, label: "January",  savingsScore: 68, netflixAmount: 499 },
    { utcMonth: 1, label: "February", savingsScore: 55, netflixAmount: 499 },
    { utcMonth: 2, label: "March",    savingsScore: 62, netflixAmount: 649 },
    { utcMonth: 3, label: "April",    savingsScore: 60, netflixAmount: 649 },
  ];

  for (const m of monthDefs) {
    const { totalSpend, totalCredit, catSum, catCount } = monthlyStats(m.utcMonth);

    const rentAmt  = catSum(CategoryName.RENT_HOUSING);
    const foodAmt  = catSum(CategoryName.FOOD_DINING);
    const coffeeAmt = catSum(CategoryName.COFFEE_CAFES);
    const shopAmt  = catSum(CategoryName.SHOPPING);
    const subAmt   = catSum(CategoryName.SUBSCRIPTIONS);
    const utilAmt  = catSum(CategoryName.UTILITIES);
    const rideAmt  = catSum(CategoryName.TRANSPORT);
    const grocAmt  = catSum(CategoryName.GROCERIES);

    const pct = (a: number) => totalSpend > 0 ? Math.round((a / totalSpend) * 100) : 0;

    // Fixed recurring: rent + subs + internet (BESCOM varies so excluded)
    const recurringTotal = rentAmt + subAmt + 999; // 999 = Airtel
    // Avoidable: forgotten sub + late-night food share + duplicate (Feb only)
    const lateNightShare = m.utcMonth === 1 ? foodAmt * 0.45 + 450 : foodAmt * 0.38;
    const avoidableSpend = 899 + lateNightShare; // 899 = Cult.fit

    await prisma.spendingSnapshot.create({
      data: {
        userId:          uid,
        month:           new Date(Date.UTC(2026, m.utcMonth, 1)),
        totalSpend,
        totalCredit,
        recurringTotal,
        avoidableSpend:  Math.round(avoidableSpend),
        transactionCount: txInputs.filter((t) => t.date.getUTCMonth() === m.utcMonth).length,
        savingsScore:    m.savingsScore,
        topCategories: [
          { category: "RENT_HOUSING",  amount: rentAmt,   percentage: pct(rentAmt) },
          { category: "FOOD_DINING",   amount: foodAmt,   percentage: pct(foodAmt) },
          { category: "COFFEE_CAFES",  amount: coffeeAmt, percentage: pct(coffeeAmt) },
          { category: "SHOPPING",      amount: shopAmt,   percentage: pct(shopAmt) },
          { category: "SUBSCRIPTIONS", amount: subAmt,    percentage: pct(subAmt) },
        ],
        categoryBreakdown: {
          RENT_HOUSING:  { amount: rentAmt,   count: catCount(CategoryName.RENT_HOUSING) },
          FOOD_DINING:   { amount: foodAmt,   count: catCount(CategoryName.FOOD_DINING) },
          COFFEE_CAFES:  { amount: coffeeAmt, count: catCount(CategoryName.COFFEE_CAFES) },
          SHOPPING:      { amount: shopAmt,   count: catCount(CategoryName.SHOPPING) },
          SUBSCRIPTIONS: { amount: subAmt,    count: catCount(CategoryName.SUBSCRIPTIONS) },
          UTILITIES:     { amount: utilAmt,   count: catCount(CategoryName.UTILITIES) },
          TRANSPORT:     { amount: rideAmt,   count: catCount(CategoryName.TRANSPORT) },
          GROCERIES:     { amount: grocAmt,   count: catCount(CategoryName.GROCERIES) },
        },
      },
    });
    console.log(`  ✓  SpendingSnapshot ${m.label} — total debit ₹${totalSpend.toLocaleString("en-IN")}`);
  }

  console.log(`
╔═══════════════════════════════════════════════════╗
║  BillBrain demo seed complete                     ║
║                                                   ║
║  Login:    demo@billbrain.ai                      ║
║  Password: demo1234                               ║
║                                                   ║
║  • ${createdTxs.length} transactions  (Jan–Apr 2026)         ║
║  • 18 merchants                                   ║
║  • 6 recurring charges                            ║
║  • ${signalCount} subscription signals                    ║
║  • 6 insights                                     ║
║  • 4 spending snapshots                           ║
╚═══════════════════════════════════════════════════╝`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
