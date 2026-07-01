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

  // ── Build grounded context + citations ────────────────────────────────────
  const { prompt: systemPrompt, citations } = await buildContext(userId, message);

  // ── Assemble message array ────────────────────────────────────────────────
  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    ...history
      .filter((h) => h.role === "user" || h.role === "assistant")
      .slice(-10)
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: message },
  ];

  const provider = getProvider();
  const aiProvider: AIProvider = PROVIDER_MAP[provider.providerName] ?? "DEMO";

  // ── Resolve / create the chat session up-front so we can stream its id ─────
  let sessionId = existingSessionId;
  if (sessionId) {
    const existing = await db.chatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!existing) sessionId = undefined;
  }
  if (!sessionId) {
    const newSession = await db.chatSession.create({
      data: { userId, aiProvider, title: message.slice(0, 60), messageCount: 0 },
    });
    sessionId = newSession.id;
  }
  const resolvedSessionId = sessionId;

  // ── Stream NDJSON: {type:"meta"} then {type:"delta"}… then {type:"done"} ───
  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(send({ type: "meta", sessionId: resolvedSessionId, citations }));

      let full = "";
      try {
        for await (const delta of provider.stream(messages)) {
          full += delta;
          controller.enqueue(send({ type: "delta", text: delta }));
        }
      } catch (err) {
        controller.enqueue(send({ type: "error", message: "generation-failed" }));
        console.error("chat stream error:", err);
      }

      // Persist the completed turn (best-effort; never blocks the client).
      try {
        await db.$transaction([
          db.chatMessage.create({
            data: { sessionId: resolvedSessionId, userId, role: "USER", content: message, citations: [] },
          }),
          db.chatMessage.create({
            data: {
              sessionId: resolvedSessionId, userId, role: "ASSISTANT", content: full,
              citations: citations.map((c) => c.id),
              model: provider.providerName.toLowerCase(),
            },
          }),
          db.chatSession.update({
            where: { id: resolvedSessionId },
            data: { messageCount: { increment: 2 }, aiProvider, updatedAt: new Date() },
          }),
        ]);
      } catch (err) {
        console.error("chat persist error:", err);
      }

      controller.enqueue(send({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
