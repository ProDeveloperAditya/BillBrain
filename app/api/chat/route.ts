import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/ai/providerFactory";
import { buildContext } from "@/lib/rag/contextBuilder";
import type { AIMessage } from "@/lib/ai/types";
import type { AIProvider } from "@prisma/client";

const PROVIDER_MAP: Record<string, AIProvider> = {
  OPENAI: "OPENAI",
  GROQ:   "GROQ",
  DEMO:   "DEMO",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { message: string; sessionId?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, sessionId: existingSessionId, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // ── Build context system prompt ───────────────────────────────────────────
  const systemPrompt = await buildContext(userId, message);

  // ── Assemble message array ────────────────────────────────────────────────
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((h) => h.role === "user" || h.role === "assistant")
      .slice(-10)
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  // ── Call AI provider ──────────────────────────────────────────────────────
  const provider = getProvider();
  const result = await provider.complete(messages);

  const aiProvider: AIProvider = PROVIDER_MAP[provider.providerName] ?? "DEMO";

  // ── Persist to DB ─────────────────────────────────────────────────────────
  let sessionId = existingSessionId;

  if (sessionId) {
    // Verify it belongs to this user
    const existing = await db.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!existing) sessionId = undefined;
  }

  if (!sessionId) {
    const newSession = await db.chatSession.create({
      data: {
        userId,
        aiProvider,
        title: message.slice(0, 60),
        messageCount: 0,
      },
    });
    sessionId = newSession.id;
  }

  await db.$transaction([
    db.chatMessage.create({
      data: {
        sessionId,
        userId,
        role: "USER",
        content: message,
        citations: [],
      },
    }),
    db.chatMessage.create({
      data: {
        sessionId,
        userId,
        role: "ASSISTANT",
        content: result.text,
        citations: [],
        tokenCount: result.tokensUsed || null,
        model: provider.providerName.toLowerCase(),
      },
    }),
    db.chatSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 2 },
        aiProvider,
        updatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ text: result.text, sessionId });
}
