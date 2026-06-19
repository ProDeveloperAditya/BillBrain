"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Currency, SpendingGoal } from "@/types";

export interface OnboardingData {
  monthlyIncomeRange: string;
  currency: Currency;
  spendingGoal: SpendingGoal;
  useSampleData: boolean;
}

export async function saveOnboardingAction(data: OnboardingData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  await db.profile.upsert({
    where: { userId: session.user.id },
    update: {
      monthlyIncomeRange: data.monthlyIncomeRange || null,
      currency: data.currency,
      spendingGoal: data.spendingGoal,
      onboardingCompleted: true,
      demoMode: data.useSampleData,
    },
    create: {
      userId: session.user.id,
      monthlyIncomeRange: data.monthlyIncomeRange || null,
      currency: data.currency,
      spendingGoal: data.spendingGoal,
      onboardingCompleted: true,
      demoMode: data.useSampleData,
    },
  });

  redirect("/dashboard");
}
