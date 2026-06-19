// Shared application types — mirror Prisma enums so UI code doesn't import from @prisma/client directly.
// Re-export from here for consistent imports across the codebase.

// ─── Enum mirrors ─────────────────────────────────────────────────────────────

export type TransactionType = "DEBIT" | "CREDIT";

export type UploadStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export type ParseMethod = "CSV" | "PDF" | "SMS_TEXT" | "EMAIL_TEXT" | "MANUAL";

export type CategoryName =
  | "FOOD_DINING"
  | "GROCERIES"
  | "SUBSCRIPTIONS"
  | "TRANSPORT"
  | "SHOPPING"
  | "HEALTHCARE"
  | "EDUCATION"
  | "SALARY_INCOME"
  | "RENT_HOUSING"
  | "UTILITIES"
  | "ENTERTAINMENT"
  | "COFFEE_CAFES"
  | "TRAVEL"
  | "INSURANCE"
  | "BANKING_FEES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "OTHER";

export type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "FORTNIGHTLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "YEARLY"
  | "IRREGULAR";

export type InsightType =
  | "LEAK"
  | "SUBSCRIPTION_ALERT"
  | "SAVINGS_OPPORTUNITY"
  | "ANOMALY"
  | "CATEGORY_SPIKE"
  | "DUPLICATE_CHARGE"
  | "WEEKLY_DIGEST";

export type InsightSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export type AIProvider = "OPENAI" | "GEMINI" | "GROQ" | "DEMO";

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "SGD" | "AED";

export type SpendingGoal =
  | "SAVE_MORE"
  | "CUT_SUBSCRIPTIONS"
  | "UNDERSTAND_PATTERNS"
  | "REDUCE_LEAKS"
  | "BUILD_EMERGENCY_FUND";

// ─── Application DTOs ─────────────────────────────────────────────────────────
// These are lightweight shapes used in UI layers — not DB row types.

export interface TransactionDTO {
  id: string;
  date: Date;
  merchant: string | null;
  normalizedMerchant: string | null;
  amount: number;
  currency: Currency;
  type: TransactionType;
  rawDescription: string | null;
  description: string | null;
  category: CategoryName;
  isRecurring: boolean;
  isFlagged: boolean;
  isDuplicate: boolean;
  tags: string[];
  confidence: number;
  sourceFileId: string | null;
}

export interface RecurringChargeDTO {
  id: string;
  merchantName: string;
  normalizedName: string;
  frequency: RecurringFrequency;
  averageAmount: number;
  currency: Currency;
  firstSeenDate: Date | null;
  lastChargedDate: Date | null;
  estimatedNextDate: Date | null;
  confidenceScore: number;
  annualCost: number;
  isPossiblyForgotten: boolean;
  isCancelled: boolean;
}

export interface InsightDTO {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  isDismissed: boolean;
  generatedAt: Date;
}

export interface KPIData {
  totalSpend: number;
  totalCredit: number;
  avoidableSpend: number;
  recurringTotal: number;
  activeSubscriptions: number;
  unusualAlerts: number;
  savingsScore: number | null;
  currency: Currency;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: CategoryName;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: Date;
  totalSpend: number;
  totalCredit: number;
  recurringTotal: number;
}
