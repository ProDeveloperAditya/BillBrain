import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shared/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Middleware handles most redirects, but this is a belt-and-suspenders check
  if (!session?.user) {
    redirect("/sign-in");
  }

  return <AppShell session={session}>{children}</AppShell>;
}
