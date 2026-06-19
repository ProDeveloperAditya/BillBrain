import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AssistantClient } from "@/components/assistant/AssistantClient";

export const metadata = { title: "AI Assistant — BillBrain AI" };

export default async function AssistantPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const requested = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const isDemo =
    requested === "demo" ||
    (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY);

  return <AssistantClient isDemo={isDemo} />;
}
