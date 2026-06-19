"use server";

import { auth } from "@/auth";
import { db as prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseCsv } from "@/lib/parsers/csvParser";
import { parseSms } from "@/lib/parsers/smsParser";
import { parseEmail } from "@/lib/parsers/emailParser";
import { runNormalizationPipeline } from "@/lib/normalization/pipeline";
import { detectDuplicates } from "@/lib/normalization/duplicateDetector";
import type { PreviewRow } from "@/lib/parsers/types";
import type { CategoryName, ParseMethod } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseActionResult {
  success: boolean;
  data: PreviewRow[];
  errors: string[];
}

export interface ConfirmActionResult {
  success: boolean;
  saved: number;
  skipped: number;
  errors: string[];
}

// ─── Shared post-parse pipeline ───────────────────────────────────────────────

async function postProcess(
  raw: ReturnType<typeof parseCsv>,
  userId: string
): Promise<ParseActionResult> {
  if (!raw.success && raw.data.length === 0) {
    return { success: false, data: [], errors: raw.errors };
  }
  const normalized = runNormalizationPipeline(raw.data);
  const withDupes  = await detectDuplicates(normalized, userId);
  return { success: true, data: withDupes, errors: raw.errors };
}

// ─── Parse actions ─────────────────────────────────────────────────────────────

export async function parseCsvAction(text: string): Promise<ParseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, data: [], errors: ["Not authenticated"] };
  const raw = parseCsv(text);
  return postProcess(raw, session.user.id);
}

export async function parsePdfAction(base64: string): Promise<ParseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, data: [], errors: ["Not authenticated"] };

  // Lazy import so pdf-parse never gets bundled for the client
  const { parsePdf } = await import("@/lib/parsers/pdfParser");
  const buffer = Buffer.from(base64, "base64");
  const raw = await parsePdf(buffer);
  return postProcess(raw, session.user.id);
}

export async function parseSmsAction(text: string): Promise<ParseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, data: [], errors: ["Not authenticated"] };
  const raw = parseSms(text);
  return postProcess(raw, session.user.id);
}

export async function parseEmailAction(text: string): Promise<ParseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, data: [], errors: ["Not authenticated"] };
  const raw = parseEmail(text);
  return postProcess(raw, session.user.id);
}

// ─── Confirm import ───────────────────────────────────────────────────────────

export async function confirmImportAction(
  rows: PreviewRow[],
  parseMethod: ParseMethod,
  filename: string,
  fileSize: number = 0
): Promise<ConfirmActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, saved: 0, skipped: 0, errors: ["Not authenticated"] };

  const userId = session.user.id;
  const errors: string[] = [];

  // Re-run duplicate check against DB with the (potentially edited) rows
  const checkedRows = await detectDuplicates(rows, userId);

  const toSave = checkedRows.filter((r) => !r.isDuplicate);
  const skipped = checkedRows.length - toSave.length;

  if (toSave.length === 0) {
    return { success: true, saved: 0, skipped, errors: ["All rows are duplicates — nothing new to import"] };
  }

  try {
    // Create an UploadedFile record
    const mimeMap: Record<ParseMethod, string> = {
      CSV:        "text/csv",
      PDF:        "application/pdf",
      SMS_TEXT:   "text/plain",
      EMAIL_TEXT: "text/plain",
      MANUAL:     "text/plain",
    };

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        userId,
        filename,
        mimeType: mimeMap[parseMethod] ?? "text/plain",
        size: fileSize,
        parseMethod,
        status: "DONE",
        recordCount: toSave.length,
      },
    });

    // Create transactions
    await prisma.transaction.createMany({
      data: toSave.map((row) => ({
        userId,
        sourceFileId: uploadedFile.id,
        date:               new Date(row.date),
        amount:             row.amount,
        currency:           "INR",
        type:               row.type,
        rawDescription:     row.rawDescription,
        description:        row.merchant,
        category:           row.category as CategoryName,
        isFlagged:          row.isFlagged ?? false,
        isDuplicate:        false,
        isRecurring:        false,
        normalizedMerchant: row.merchant,
        confidence:         0.85,
        tags:               [],
      })),
    });

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return { success: true, saved: toSave.length, skipped, errors };
  } catch (e) {
    errors.push(`Database error: ${String(e)}`);
    return { success: false, saved: 0, skipped, errors };
  }
}
