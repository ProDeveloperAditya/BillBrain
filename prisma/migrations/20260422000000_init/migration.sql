-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ParseMethod" AS ENUM ('CSV', 'PDF', 'SMS_TEXT', 'EMAIL_TEXT', 'MANUAL');

-- CreateEnum
CREATE TYPE "CategoryName" AS ENUM ('FOOD_DINING', 'GROCERIES', 'SUBSCRIPTIONS', 'TRANSPORT', 'SHOPPING', 'HEALTHCARE', 'EDUCATION', 'SALARY_INCOME', 'RENT_HOUSING', 'UTILITIES', 'ENTERTAINMENT', 'COFFEE_CAFES', 'TRAVEL', 'INSURANCE', 'BANKING_FEES', 'TRANSFERS', 'INVESTMENTS', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'IRREGULAR');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('LEAK', 'SUBSCRIPTION_ALERT', 'SAVINGS_OPPORTUNITY', 'ANOMALY', 'CATEGORY_SPIKE', 'DUPLICATE_CHARGE', 'WEEKLY_DIGEST');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'GEMINI', 'GROQ', 'DEMO');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED');

-- CreateEnum
CREATE TYPE "SpendingGoal" AS ENUM ('SAVE_MORE', 'CUT_SUBSCRIPTIONS', 'UNDERSTAND_PATTERNS', 'REDUCE_LEAKS', 'BUILD_EMERGENCY_FUND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "monthlyIncomeRange" TEXT,
    "spendingGoal" "SpendingGoal",
    "financialPersonality" TEXT,
    "preferredAiProvider" "AIProvider" NOT NULL DEFAULT 'DEMO',
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "parseMethod" "ParseMethod" NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "checksum" TEXT,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "rawText" TEXT,
    "parseMethod" "ParseMethod" NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "parsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParsedSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" "CategoryName" NOT NULL DEFAULT 'OTHER',
    "logoUrl" TEXT,
    "website" TEXT,
    "isSubscription" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" "CategoryName" NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT,
    "sourceFileId" TEXT,
    "parsedSourceId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "type" "TransactionType" NOT NULL,
    "rawDescription" TEXT,
    "description" TEXT,
    "category" "CategoryName" NOT NULL DEFAULT 'OTHER',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "normalizedMerchant" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCharge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT,
    "merchantName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "averageAmount" DECIMAL(12,2) NOT NULL,
    "amountVariance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "firstSeenDate" TIMESTAMP(3),
    "lastChargedDate" TIMESTAMP(3),
    "estimatedNextDate" TIMESTAMP(3),
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "annualCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isPossiblyForgotten" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "recurringChargeId" TEXT,
    "merchantName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "signalDate" TIMESTAMP(3) NOT NULL,
    "frequency" "RecurringFrequency",
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "aiProvider" "AIProvider" NOT NULL DEFAULT 'DEMO',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" TEXT[],
    "tokenCount" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddingChunk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parsedSourceId" TEXT,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embeddingModel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbeddingChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpendingSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalSpend" DECIMAL(12,2) NOT NULL,
    "totalCredit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recurringTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avoidableSpend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "savingsScore" DOUBLE PRECISION,
    "topCategories" JSONB NOT NULL,
    "categoryBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpendingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "UploadedFile_userId_idx" ON "UploadedFile"("userId");

-- CreateIndex
CREATE INDEX "UploadedFile_userId_status_idx" ON "UploadedFile"("userId", "status");

-- CreateIndex
CREATE INDEX "UploadedFile_checksum_idx" ON "UploadedFile"("checksum");

-- CreateIndex
CREATE INDEX "ParsedSource_userId_idx" ON "ParsedSource"("userId");

-- CreateIndex
CREATE INDEX "ParsedSource_fileId_idx" ON "ParsedSource"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_normalizedName_key" ON "Merchant"("normalizedName");

-- CreateIndex
CREATE INDEX "Merchant_normalizedName_idx" ON "Merchant"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date" DESC);

-- CreateIndex
CREATE INDEX "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

-- CreateIndex
CREATE INDEX "Transaction_userId_isRecurring_idx" ON "Transaction"("userId", "isRecurring");

-- CreateIndex
CREATE INDEX "Transaction_userId_isFlagged_idx" ON "Transaction"("userId", "isFlagged");

-- CreateIndex
CREATE INDEX "Transaction_userId_isDuplicate_idx" ON "Transaction"("userId", "isDuplicate");

-- CreateIndex
CREATE INDEX "Transaction_sourceFileId_idx" ON "Transaction"("sourceFileId");

-- CreateIndex
CREATE INDEX "Transaction_parsedSourceId_idx" ON "Transaction"("parsedSourceId");

-- CreateIndex
CREATE INDEX "Transaction_normalizedMerchant_idx" ON "Transaction"("normalizedMerchant");

-- CreateIndex
CREATE INDEX "RecurringCharge_userId_idx" ON "RecurringCharge"("userId");

-- CreateIndex
CREATE INDEX "RecurringCharge_userId_normalizedName_idx" ON "RecurringCharge"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "RecurringCharge_userId_isPossiblyForgotten_idx" ON "RecurringCharge"("userId", "isPossiblyForgotten");

-- CreateIndex
CREATE INDEX "SubscriptionSignal_userId_idx" ON "SubscriptionSignal"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionSignal_transactionId_idx" ON "SubscriptionSignal"("transactionId");

-- CreateIndex
CREATE INDEX "SubscriptionSignal_recurringChargeId_idx" ON "SubscriptionSignal"("recurringChargeId");

-- CreateIndex
CREATE INDEX "SubscriptionSignal_userId_normalizedName_idx" ON "SubscriptionSignal"("userId", "normalizedName");

-- CreateIndex
CREATE INDEX "Insight_userId_type_idx" ON "Insight"("userId", "type");

-- CreateIndex
CREATE INDEX "Insight_userId_isRead_idx" ON "Insight"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Insight_userId_isDismissed_idx" ON "Insight"("userId", "isDismissed");

-- CreateIndex
CREATE INDEX "Insight_userId_generatedAt_idx" ON "Insight"("userId", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatSession_userId_updatedAt_idx" ON "ChatSession"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "EmbeddingChunk_userId_idx" ON "EmbeddingChunk"("userId");

-- CreateIndex
CREATE INDEX "EmbeddingChunk_parsedSourceId_idx" ON "EmbeddingChunk"("parsedSourceId");

-- CreateIndex
CREATE INDEX "EmbeddingChunk_userId_chunkIndex_idx" ON "EmbeddingChunk"("userId", "chunkIndex");

-- CreateIndex
CREATE INDEX "SpendingSnapshot_userId_idx" ON "SpendingSnapshot"("userId");

-- CreateIndex
CREATE INDEX "SpendingSnapshot_userId_month_idx" ON "SpendingSnapshot"("userId", "month" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SpendingSnapshot_userId_month_key" ON "SpendingSnapshot"("userId", "month");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedSource" ADD CONSTRAINT "ParsedSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedSource" ADD CONSTRAINT "ParsedSource_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_parsedSourceId_fkey" FOREIGN KEY ("parsedSourceId") REFERENCES "ParsedSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionSignal" ADD CONSTRAINT "SubscriptionSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionSignal" ADD CONSTRAINT "SubscriptionSignal_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionSignal" ADD CONSTRAINT "SubscriptionSignal_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "RecurringCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbeddingChunk" ADD CONSTRAINT "EmbeddingChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmbeddingChunk" ADD CONSTRAINT "EmbeddingChunk_parsedSourceId_fkey" FOREIGN KEY ("parsedSourceId") REFERENCES "ParsedSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpendingSnapshot" ADD CONSTRAINT "SpendingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

