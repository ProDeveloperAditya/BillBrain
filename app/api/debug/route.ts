// TEMPORARY diagnostic endpoint — remove after debugging.
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "bb-debug-9k2";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const out: Record<string, unknown> = { node: process.version };

  // pdf-parse load test
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require("pdf-parse");
    out.pdfParseKeys = Object.keys(m).slice(0, 8);
    out.pdfParseType = typeof m.PDFParse;
  } catch (e) {
    out.pdfParseLoadError = String(e);
  }

  // DB test
  try {
    const { db } = await import("@/lib/db");
    out.dbUserCount = await db.user.count();
  } catch (e) {
    out.dbError = String(e);
  }

  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("k") !== KEY) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const { base64 } = (await req.json()) as { base64: string };
    const { parsePdf } = await import("@/lib/parsers/pdfParser");
    const buffer = Buffer.from(base64, "base64");
    const r = await parsePdf(buffer);
    return NextResponse.json({
      success: r.success,
      count: r.data.length,
      errors: r.errors,
      sample: r.data.slice(0, 3),
    });
  } catch (e) {
    return NextResponse.json({
      thrown: String(e),
      stack: (e as Error)?.stack?.split("\n").slice(0, 6),
    });
  }
}
