import { auth } from "@/auth";
import { LandingClient } from "@/components/marketing/LandingClient";

export const metadata = {
  title: "BillBrain AI — Find where your money disappears",
  description:
    "AI-powered spending intelligence. Detect subscription waste, expose money leaks, and ask questions about your finances — grounded in your actual data.",
};

export default async function LandingPage() {
  const session = await auth();
  return <LandingClient isLoggedIn={!!session?.user} />;
}
