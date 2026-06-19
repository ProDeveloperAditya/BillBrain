"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Target,
  Database,
  Check,
  Loader2,
  Scissors,
  TrendingUp,
  Lightbulb,
  Droplets,
  PiggyBank,
  Upload,
  Sparkles,
} from "lucide-react";
import { saveOnboardingAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Currency, SpendingGoal } from "@/types";

// ─── Data ──────────────────────────────────────────────────────────────────────

const INCOME_RANGES = [
  { value: "under-30k", label: "Under ₹30k / month" },
  { value: "30k-75k", label: "₹30k – ₹75k / month" },
  { value: "75k-150k", label: "₹75k – ₹1.5L / month" },
  { value: "150k-plus", label: "₹1.5L+ / month" },
  { value: "prefer-not", label: "Prefer not to say" },
];

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "SGD", label: "Singapore Dollar", symbol: "S$" },
];

const SPENDING_GOALS: {
  value: SpendingGoal;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: "UNDERSTAND_PATTERNS",
    label: "Understand my spending",
    desc: "Get clarity on where every rupee actually goes",
    icon: Lightbulb,
  },
  {
    value: "CUT_SUBSCRIPTIONS",
    label: "Cut subscriptions",
    desc: "Find and kill subscriptions I've forgotten about",
    icon: Scissors,
  },
  {
    value: "SAVE_MORE",
    label: "Save more each month",
    desc: "Identify what to reduce to hit my savings target",
    icon: TrendingUp,
  },
  {
    value: "REDUCE_LEAKS",
    label: "Reduce money leaks",
    desc: "Stop the small, habitual drains on my budget",
    icon: Droplets,
  },
  {
    value: "BUILD_EMERGENCY_FUND",
    label: "Build emergency fund",
    desc: "Free up cash to build a financial safety net",
    icon: PiggyBank,
  },
];

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 64 : -64, opacity: 0 }),
};

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({
  incomeRange,
  currency,
  onIncomeChange,
  onCurrencyChange,
}: {
  incomeRange: string;
  currency: Currency;
  onIncomeChange: (v: string) => void;
  onCurrencyChange: (v: Currency) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          About your income
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Helps BillBrain calibrate spending ratios to your situation.
        </p>
      </div>

      {/* Income range */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Monthly income range
        </p>
        <div className="grid grid-cols-1 gap-2">
          {INCOME_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onIncomeChange(r.value)}
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium border transition-all duration-150",
                incomeRange === r.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-white/[0.02] text-foreground hover:border-border/80 hover:bg-white/[0.04]"
              )}
            >
              {r.label}
              {incomeRange === r.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Preferred currency
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onCurrencyChange(c.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl py-3 px-2 border transition-all duration-150",
                currency === c.value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-white/[0.02] text-muted-foreground hover:border-border/80 hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              <span className="text-base font-bold">{c.symbol}</span>
              <span className="text-[10px] font-medium">{c.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({
  goal,
  onGoalChange,
}: {
  goal: SpendingGoal | "";
  onGoalChange: (v: SpendingGoal) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          What&apos;s your primary goal?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          BillBrain will surface insights most relevant to this goal first.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {SPENDING_GOALS.map((g) => {
          const Icon = g.icon;
          const selected = goal === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onGoalChange(g.value)}
              className={cn(
                "group flex items-start gap-4 rounded-xl px-4 py-3.5 border text-left transition-all duration-150",
                selected
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-white/[0.02] hover:border-border/80 hover:bg-white/[0.04]"
              )}
            >
              <div className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                selected ? "bg-primary/20 text-primary" : "bg-white/[0.05] text-muted-foreground group-hover:text-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-semibold transition-colors",
                  selected ? "text-primary" : "text-foreground"
                )}>
                  {g.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {g.desc}
                </p>
              </div>
              {selected && (
                <Check className="h-4 w-4 text-primary shrink-0 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step3({
  useSampleData,
  onChoiceChange,
}: {
  useSampleData: boolean | null;
  onChoiceChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          One last thing
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How would you like to start your dashboard?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Sample data option */}
        <button
          type="button"
          onClick={() => onChoiceChange(true)}
          className={cn(
            "group flex items-start gap-4 rounded-2xl p-5 border text-left transition-all duration-150",
            useSampleData === true
              ? "border-primary/50 bg-primary/10 glow-primary"
              : "border-border bg-white/[0.02] hover:border-primary/25 hover:bg-white/[0.04]"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            useSampleData === true ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground group-hover:text-primary"
          )}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              Load sample data
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Explore BillBrain with a realistic demo dataset — UPI transactions,
              OTT subscriptions, food delivery patterns, and more. Switch to your
              own data anytime.
            </p>
            {useSampleData === true && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                <Check className="h-3 w-3" />
                Selected
              </div>
            )}
          </div>
        </button>

        {/* Own data option */}
        <button
          type="button"
          onClick={() => onChoiceChange(false)}
          className={cn(
            "group flex items-start gap-4 rounded-2xl p-5 border text-left transition-all duration-150",
            useSampleData === false
              ? "border-primary/50 bg-primary/10"
              : "border-border bg-white/[0.02] hover:border-border/80 hover:bg-white/[0.04]"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            useSampleData === false ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground group-hover:text-foreground"
          )}>
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">
              I&apos;ll upload my own data
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Start with an empty dashboard and import your bank CSV, PDF
              statement, or paste SMS transactions on the Import page.
            </p>
            {useSampleData === false && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                <Check className="h-3 w-3" />
                Selected
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Form state
  const [incomeRange, setIncomeRange] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [goal, setGoal] = useState<SpendingGoal | "">("");
  const [useSampleData, setUseSampleData] = useState<boolean | null>(null);

  const canProceed = () => {
    if (step === 1) return true; // both optional
    if (step === 2) return goal !== "";
    if (step === 3) return useSampleData !== null;
    return false;
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleFinish = () => {
    startTransition(async () => {
      await saveOnboardingAction({
        monthlyIncomeRange: incomeRange,
        currency,
        spendingGoal: (goal || "UNDERSTAND_PATTERNS") as SpendingGoal,
        useSampleData: useSampleData ?? false,
      });
    });
  };

  const handleSkip = () => {
    startTransition(async () => {
      await saveOnboardingAction({
        monthlyIncomeRange: "",
        currency: "INR",
        spendingGoal: "UNDERSTAND_PATTERNS",
        useSampleData: false,
      });
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/[0.05] blur-[140px]" />
      </div>

      {/* Logo */}
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <span className="font-semibold text-[15px]">
          BillBrain<span className="text-primary"> AI</span>
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl ring-1 ring-white/[0.06] overflow-hidden">
          {/* Progress header */}
          <div className="px-7 pt-6 pb-0">
            {/* Step pills */}
            <div className="flex items-center gap-2 mb-5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i + 1 <= step ? "bg-primary" : "bg-white/[0.1]",
                    i + 1 === step ? "flex-[2]" : "flex-1"
                  )}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0">
              Step {step} of {TOTAL_STEPS}
            </p>
          </div>

          {/* Animated step content */}
          <div className="px-7 pb-6 pt-4 min-h-[420px] flex flex-col">
            <div className="flex-1 overflow-hidden">
              <AnimatePresence custom={direction} mode="wait">
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 380, damping: 38 }}
                >
                  {step === 1 && (
                    <Step1
                      incomeRange={incomeRange}
                      currency={currency}
                      onIncomeChange={setIncomeRange}
                      onCurrencyChange={setCurrency}
                    />
                  )}
                  {step === 2 && (
                    <Step2
                      goal={goal}
                      onGoalChange={setGoal}
                    />
                  )}
                  {step === 3 && (
                    <Step3
                      useSampleData={useSampleData}
                      onChoiceChange={setUseSampleData}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                disabled={step === 1 || isPending}
                className="text-muted-foreground"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {step < TOTAL_STEPS && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="text-muted-foreground text-xs"
                  >
                    Skip setup
                  </Button>
                )}
                <Button
                  onClick={goNext}
                  disabled={!canProceed() || isPending}
                  size="sm"
                  className="min-w-[100px]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : step < TOTAL_STEPS ? (
                    <>
                      Continue
                      <ChevronRight className="ml-1.5 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Go to dashboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground leading-relaxed">
          You can change any of these preferences later in{" "}
          <span className="text-foreground/50">Settings → Profile</span>.
        </p>
      </div>
    </div>
  );
}
