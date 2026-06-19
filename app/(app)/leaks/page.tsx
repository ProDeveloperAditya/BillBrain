import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeakData } from "@/lib/analytics/leakDetector";
import { LeaksClient } from "@/components/leaks/LeaksClient";

export const metadata = { title: "Money Leaks — BillBrain AI" };

export default async function LeaksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const data = await getLeakData(session.user.id);

  return <LeaksClient data={data} />;
}
