import { Brain } from "lucide-react";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Sign In" };

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Premium background gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet/[0.05] blur-[100px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25 shadow-lg shadow-primary/10">
          <Brain className="h-5.5 w-5.5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your{" "}
            <span className="text-primary font-medium">BillBrain AI</span>{" "}
            account
          </p>
        </div>
      </div>

      <SignInForm callbackUrl={callbackUrl} />
    </div>
  );
}
