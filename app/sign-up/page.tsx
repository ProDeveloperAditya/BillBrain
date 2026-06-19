import { Brain, Sparkles } from "lucide-react";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-violet/[0.04] blur-[100px]" />
      </div>

      {/* Logo + copy */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/25 shadow-lg shadow-primary/10">
          <Brain className="h-5.5 w-5.5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Start your financial clarity
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Join{" "}
            <span className="text-primary font-medium">BillBrain AI</span>
            {" "}— detect leaks, hunt subscriptions, understand your money.
          </p>
        </div>

        {/* Social proof pill */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          Free to start · No credit card required
        </div>
      </div>

      <SignUpForm />
    </div>
  );
}
