import "server-only";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { parseCsv } from "@/lib/parsers/csvParser";
import { parseSms } from "@/lib/parsers/smsParser";
import { parseEmail } from "@/lib/parsers/emailParser";
import { runNormalizationPipeline } from "@/lib/normalization/pipeline";
import { detectDuplicates } from "@/lib/normalization/duplicateDetector";
import { generateInsights } from "@/lib/analytics/generateInsights";

import type { CategoryName, ParseMethod } from "@prisma/client";
import type { PreviewRow } from "@/lib/parsers/types";

// ── Response shape ────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  skipped:  number;
  errors:   string[];
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

const FILE_TYPE_TO_PARSE_METHOD: Record<string, ParseMethod> = {
  csv:   "CSV",
  pdf:   "PDF",
  sms:   "SMS_TEXT",
  email: "EMAIL_TEXT",
};

const PARSE_METHOD_TO_MIME: Record<ParseMethod, string> = {
  CSV:        "text/csv",
  PDF:        "application/pdf",
  SMS_TEXT:   "text/plain",
  EMAIL_TEXT: "text/plain",
  MANUAL:     "text/plain",
};

// ── Shared DB write ───────────────────────────────────────────────────────────

async function persistRows(
  rows: PreviewRow[],
  userId: string,
  parseMethod: ParseMethod,
  filename: string,
  fileSize: number,
  parseErrors: string[] = [],
): Promise<NextResponse<ImportResult>> {
  const errors = [...parseErrors];

  // Final duplicate check (handles user-edited rows in confirm flow)
  const checked = await detectDuplicates(rows, userId);
  const toSave  = checked.filter((r) => !r.isDuplicate);
  const skipped = checked.length - toSave.length;

  if (toSave.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped,
      errors: [...errors, "All rows are duplicates — nothing new to import"],
    });
  }

  // Create UploadedFile record first
  const uploadedFile = await db.uploadedFile.create({
    data: {
      userId,
      filename,
      mimeType:    PARSE_METHOD_TO_MIME[parseMethod] ?? "text/plain",
      size:        fileSize,
      parseMethod,
      status:      "DONE",
      recordCount: toSave.length,
    },
  });

  await db.transaction.createMany({
    data: toSave.map((row) => ({
      userId,
      sourceFileId:       uploadedFile.id,
      date:               new Date(row.date),
      amount:             row.amount,
      currency:           "INR",
      type:               row.type,
      rawDescription:     row.rawDescription,
      description:        row.merchant,
      category:           row.category as CategoryName,
      normalizedMerchant: row.merchant,
      isFlagged:          row.isFlagged ?? false,
      isDuplicate:        false,
      isRecurring:        false,
      confidence:         0.85,
      tags:               [],
    })),
  });

  // Invalidate all pages that display transaction data
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/insights");

  // Regenerate insights in the background — do not await so the response is immediate
  void generateInsights(userId);

  return NextResponse.json({ imported: toSave.length, skipped, errors });
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const contentType = request.headers.get("content-type") ?? "";

  // ── JSON path ─────────────────────────────────────────────────────────────
  // Used by the ImportsClient confirm button (sends user-edited PreviewRow[])
  if (contentType.includes("application/json")) {
    let body: {
      rows:        PreviewRow[];
      parseMethod: ParseMethod;
      filename:    string;
      fileSize?:   number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { rows, parseMethod, filename, fileSize = 0 } = body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({
        imported: 0, skipped: 0, errors: ["No rows to import"],
      });
    }

    try {
      return await persistRows(rows, userId, parseMethod, filename, fileSize);
    } catch (e) {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: [`Database error: ${String(e)}`] },
        { status: 500 },
      );
    }
  }

  // ── Multipart path ────────────────────────────────────────────────────────
  // One-shot upload: parse raw file/text → normalize → dedupe → insert
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse multipart form data" }, { status: 400 });
  }

  const fileTypeRaw = formData.get("fileType")?.toString()?.toLowerCase();
  if (!fileTypeRaw || !(fileTypeRaw in FILE_TYPE_TO_PARSE_METHOD)) {
    return NextResponse.json(
      { error: "fileType must be one of: csv, pdf, sms, email" },
      { status: 400 },
    );
  }

  const parseMethod = FILE_TYPE_TO_PARSE_METHOD[fileTypeRaw];
  let filename  = `upload.${fileTypeRaw}`;
  let fileSize  = 0;
  let rows: PreviewRow[] = [];
  const parseErrors: string[] = [];

  try {
    if (fileTypeRaw === "csv" || fileTypeRaw === "pdf") {
      // ── File upload ───────────────────────────────────────────────────────
      const fileField = formData.get("file");
      if (!fileField || typeof fileField === "string") {
        return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
      }

      filename = (fileField as File).name || filename;
      fileSize = (fileField as File).size;

      if (fileTypeRaw === "csv") {
        const text   = await (fileField as File).text();
        const result = parseCsv(text);
        parseErrors.push(...result.errors);
        if (!result.success && result.data.length === 0) {
          return NextResponse.json({ imported: 0, skipped: 0, errors: result.errors });
        }
        rows = runNormalizationPipeline(result.data);
      } else {
        // PDF — lazy import keeps pdf-parse off the client bundle
        const { parsePdf } = await import("@/lib/parsers/pdfParser");
        const buf    = Buffer.from(await (fileField as File).arrayBuffer());
        const result = await parsePdf(buf);
        parseErrors.push(...result.errors);
        if (!result.success && result.data.length === 0) {
          return NextResponse.json({ imported: 0, skipped: 0, errors: result.errors });
        }
        rows = runNormalizationPipeline(result.data);
      }
    } else {
      // ── Text paste ────────────────────────────────────────────────────────
      const text = formData.get("text")?.toString();
      if (!text?.trim()) {
        return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
      }
      filename = fileTypeRaw === "sms" ? "sms-paste.txt" : "email-paste.txt";
      fileSize = text.length;

      if (fileTypeRaw === "sms") {
        const result = parseSms(text);
        parseErrors.push(...result.errors);
        if (!result.success && result.data.length === 0) {
          return NextResponse.json({ imported: 0, skipped: 0, errors: result.errors });
        }
        rows = runNormalizationPipeline(result.data);
      } else {
        const result = parseEmail(text);
        parseErrors.push(...result.errors);
        if (!result.success && result.data.length === 0) {
          return NextResponse.json({ imported: 0, skipped: 0, errors: result.errors });
        }
        rows = runNormalizationPipeline(result.data);
      }
    }
  } catch (e) {
    return NextResponse.json(
      { imported: 0, skipped: 0, errors: [`Parse error: ${String(e)}`] },
      { status: 500 },
    );
  }

  try {
    return await persistRows(rows, userId, parseMethod, filename, fileSize, parseErrors);
  } catch (e) {
    return NextResponse.json(
      { imported: 0, skipped: 0, errors: [`Database error: ${String(e)}`] },
      { status: 500 },
    );
  }
}
