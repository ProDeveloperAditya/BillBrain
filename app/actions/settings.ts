"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Currency, SpendingGoal, AIProvider } from "@prisma/client";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateProfileAction(data: {
  name?: string;
  currency?: Currency;
  spendingGoal?: SpendingGoal | null;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    if (data.name !== undefined) {
      await db.user.update({
        where: { id: session.user.id },
        data: { name: data.name.trim() || null },
      });
    }

    await db.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        currency: data.currency ?? "INR",
        spendingGoal: data.spendingGoal ?? undefined,
      },
      update: {
        ...(data.currency && { currency: data.currency }),
        ...(data.spendingGoal !== undefined && { spendingGoal: data.spendingGoal }),
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save profile" };
  }
}

export async function updateAiProviderAction(provider: AIProvider): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await db.profile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, preferredAiProvider: provider },
      update: { preferredAiProvider: provider },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update provider" };
  }
}

export async function resetAllDataAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  try {
    // Delete in FK dependency order
    await db.chatMessage.deleteMany({ where: { userId } });
    await db.chatSession.deleteMany({ where: { userId } });
    await db.embeddingChunk.deleteMany({ where: { userId } });
    await db.insight.deleteMany({ where: { userId } });
    await db.spendingSnapshot.deleteMany({ where: { userId } });
    await db.subscriptionSignal.deleteMany({ where: { userId } });
    await db.recurringCharge.deleteMany({ where: { userId } });
    await db.transaction.deleteMany({ where: { userId } });
    await db.parsedSource.deleteMany({ where: { userId } });
    await db.uploadedFile.deleteMany({ where: { userId } });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset data" };
  }
}
