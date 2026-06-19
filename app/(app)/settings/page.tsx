import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata = { title: "Settings — BillBrain AI" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const userId = session.user.id;

  const [user, profile] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    db.profile.findUnique({ where: { userId } }),
  ]);

  return (
    <SettingsClient
      name={user?.name ?? ""}
      email={user?.email ?? ""}
      currency={profile?.currency ?? "INR"}
      spendingGoal={profile?.spendingGoal ?? null}
      aiProvider={profile?.preferredAiProvider ?? "DEMO"}
    />
  );
}
