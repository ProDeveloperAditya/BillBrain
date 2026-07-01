import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runWeeklyDigestForUser } from "@/lib/digest/weeklyDigest";

// Vercel Cron invokes this on a schedule (see vercel.json). Runs on the Node
// runtime; may take a few seconds for many users.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly digest job. Generates a fresh WEEKLY_DIGEST insight for every user
 * with recent activity. Protected by CRON_SECRET (Vercel sends it as a Bearer
 * token); if CRON_SECRET is unset, the endpoint refuses to run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({ select: { id: true } });

  let written = 0;
  for (const u of users) {
    try {
      if (await runWeeklyDigestForUser(u.id)) written++;
    } catch (err) {
      console.error(`digest failed for user ${u.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, users: users.length, digestsWritten: written });
}
