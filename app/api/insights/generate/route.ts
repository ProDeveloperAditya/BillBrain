import "server-only";

import { auth } from "@/auth";
import { generateInsights } from "@/lib/analytics/generateInsights";
import { NextResponse } from "next/server";

export async function POST(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await generateInsights(session.user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to generate insights: ${String(e)}` },
      { status: 500 }
    );
  }
}
