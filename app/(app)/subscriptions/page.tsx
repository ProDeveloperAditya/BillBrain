import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSubscriptionData } from "@/lib/analytics/recurringDetector";
import { SubscriptionsClient } from "@/components/subscriptions/SubscriptionsClient";

export const metadata = { title: "Subscriptions — BillBrain AI" };

export default async function SubscriptionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const data = await getSubscriptionData(session.user.id);

  return <SubscriptionsClient data={data} />;
}
