import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";
import type { Currency, SpendingGoal, AIProvider } from "@prisma/client";

export const metadata = { title: "Settings — BillBrain AI" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const userId = session.user.id;

  // Resilient defaults from the session — used if the DB read hiccups
  // (e.g. Neon free-tier connection wake-up). Mirrors the fallback the
  // other pages use so Settings never hard-crashes into a 500.
  let name = session.user.name ?? "";
  let email = session.user.email ?? "";
  let currency: Currency = "INR";
  let spendingGoal: SpendingGoal | null = null;
  let aiProvider: AIProvider = "DEMO";

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const profile = await db.profile.findUnique({ where: { userId } });

    if (user) {
      name = user.name ?? name;
      email = user.email ?? email;
    }
    if (profile) {
      currency = profile.currency;
      spendingGoal = profile.spendingGoal;
      aiProvider = profile.preferredAiProvider;
    }
  } catch (err) {
    console.error("settings: profile read failed, using session fallback", err);
  }

  return (
    <SettingsClient
      name={name}
      email={email}
      currency={currency}
      spendingGoal={spendingGoal}
      aiProvider={aiProvider}
    />
  );
}
