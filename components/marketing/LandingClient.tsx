"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ArrowRight,
  Layers,
  Zap,
  Bot,
  ChevronDown,
  Check,
  Upload,
  BarChart3,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-primary mb-3">
      {children}
    </span>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-border/40" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NAVBAR
// ─────────────────────────────────────────────────────────────────────────────

function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between h-14 px-5 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <Brain className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="font-semibold text-[14px] tracking-tight">
          BillBrain<span className="text-primary"> AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <Button size="sm" render={<Link href="/dashboard" />}>
            <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
            Dashboard
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
              Sign In
            </Button>
            <Button size="sm" render={<Link href="/sign-up" />}>
              Get Started
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HERO
// ─────────────────────────────────────────────────────────────────────────────

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center text-center px-4 pt-14 overflow-hidden">
      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.605_0.205_278_/_16%),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_10%,oklch(0.625_0.235_305_/_10%),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6 max-w-3xl"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-medium text-primary">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          AI-powered spending intelligence
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight gradient-text leading-[1.1]">
          Find where your money&nbsp;disappears.
        </h1>

        {/* Subheadline */}
        <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
          BillBrain AI maps your spending, detects subscription leaks, and answers your
          financial questions — all grounded in your actual data.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap justify-center mt-1">
          <Button size="lg" render={<Link href={isLoggedIn ? "/dashboard" : "/sign-up"} />}>
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="#how-it-works" />}>
            See How It Works
          </Button>
        </div>

        {/* Social proof micro-line */}
        <p className="text-[12px] text-muted-foreground/60">
          No credit card required · Import in under 2 minutes
        </p>
      </motion.div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATS BAR
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "₹2.3Cr+", label: "in leaks detected" },
  { value: "14,000+", label: "active users" },
  { value: "₹8,200", label: "avg saved per month" },
];

function StatsBar() {
  return (
    <section className="border-y border-border/40 bg-surface-1/50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-3 gap-6 text-center divide-x divide-border/40">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">
                {s.value}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEATURES
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    color: "#8b5cf6",
    title: "Subscription Hunter",
    desc: "Automatically surfaces every recurring charge — including the ones you forgot you were paying. Annual cost, dormant flags, duplicate risks.",
    points: ["Detects all cadences from weekly to yearly", "Flags price increases", "Identifies dormant subscriptions"],
  },
  {
    icon: Zap,
    color: "#f59e0b",
    title: "Leak Detector",
    desc: "Finds six categories of avoidable spend: late-night food orders, convenience clusters, impulse shopping, subscription stacks, and more.",
    points: ["Annualised impact per leak", "Ranked by severity", "Actionable fix for each pattern"],
  },
  {
    icon: Bot,
    color: "#6366f1",
    title: "AI Assistant",
    desc: "Ask plain-English questions about your finances. Get answers backed by your real transaction data — not generic advice.",
    points: ["Context-aware responses", "Works with OpenAI or Groq", "Conversation history saved"],
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Your financial blind spots, illuminated
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-[15px] leading-relaxed">
            Three AI-powered tools that work together to give you a complete picture of your money.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.1}>
                <div
                  className="surface-2 border border-border rounded-2xl p-6 flex flex-col gap-4 h-full card-hover"
                  style={{ borderTopColor: f.color, borderTopWidth: 2 }}
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.color}18` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-foreground">{f.title}</h3>
                    <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                  </div>
                  <ul className="space-y-1.5 mt-auto pt-2 border-t border-border/50">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: Upload,
    title: "Upload",
    desc: "Import bank statements as CSV, PDF, SMS forwarded texts, or email receipts — all formats supported.",
  },
  {
    n: "02",
    icon: BarChart3,
    title: "Analyze",
    desc: "AI automatically maps your spending, detects recurring patterns, and scores your savings potential.",
  },
  {
    n: "03",
    icon: Zap,
    title: "Act",
    desc: "Get specific, ranked recommendations. Cancel the right subscriptions. Cut the right habits.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 border-t border-border/40 bg-surface-1/30">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            From statement to savings in minutes
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-border/0 via-border to-border/0" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} delay={i * 0.12} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-primary bg-background border border-primary/20 rounded-full h-5 w-5 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-foreground">{step.title}</h3>
                  <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed max-w-[220px] mx-auto">
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. TESTIMONIALS
// ─────────────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Priya S.",
    role: "Product Manager, Bengaluru",
    initial: "P",
    quote:
      "Found 4 forgotten subscriptions in 2 minutes. Cancelled them and saved ₹1,800 a month — money I didn't even know I was spending.",
  },
  {
    name: "Rohan M.",
    role: "Software Engineer, Hyderabad",
    initial: "R",
    quote:
      "The AI assistant answered questions about my spending I'd been ignoring for years. Felt like talking to a financial advisor who actually knew my data.",
  },
  {
    name: "Ananya K.",
    role: "Startup Founder, Mumbai",
    initial: "A",
    quote:
      "BillBrain showed me that food delivery was costing ₹3,400 a month. I genuinely had no idea. Cut it in half the next month.",
  },
];

function Testimonials() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <SectionLabel>Testimonials</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Real people, real savings
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <div className="surface-2 border border-border rounded-2xl p-5 flex flex-col gap-4 h-full">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Attribution */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-border/50">
                  <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PRICING
// ─────────────────────────────────────────────────────────────────────────────

const TIERS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    desc: "For getting started",
    highlight: false,
    features: [
      "Up to 100 transactions/month",
      "3 months transaction history",
      "Basic leak detection",
      "CSV import",
      "Subscription scanner",
    ],
    cta: "Start Free",
    href: "/sign-up",
  },
  {
    name: "Pro",
    price: "₹299",
    period: "/ month",
    desc: "For serious savers",
    highlight: true,
    features: [
      "Unlimited transactions",
      "Full transaction history",
      "AI Assistant (OpenAI / Groq)",
      "All 6 leak detector types",
      "PDF, SMS & email import",
      "Recurring charge tracker",
    ],
    cta: "Get Pro",
    href: "/sign-up?plan=pro",
  },
  {
    name: "Team",
    price: "₹799",
    period: "/ month",
    desc: "For households & small teams",
    highlight: false,
    features: [
      "Everything in Pro",
      "Up to 5 user accounts",
      "Shared dashboard",
      "Team analytics",
      "Priority support",
    ],
    cta: "Get Team",
    href: "/sign-up?plan=team",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 border-t border-border/40 bg-surface-1/30">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Simple, transparent pricing</h2>
          <p className="text-muted-foreground mt-3 text-[15px]">
            Start free. Upgrade when you see the savings.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.1}>
              <div
                className={cn(
                  "rounded-2xl border p-6 flex flex-col gap-5 relative",
                  tier.highlight
                    ? "surface-2 border-primary/40 ring-1 ring-primary/30 shadow-[0_0_50px_oklch(0.605_0.205_278_/_12%)]"
                    : "surface-1 border-border"
                )}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">{tier.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-foreground tabular-nums">{tier.price}</span>
                    <span className="text-[13px] text-muted-foreground">{tier.period}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">{tier.desc}</p>
                </div>

                <ul className="space-y-2 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 mt-0.5",
                          tier.highlight ? "text-primary" : "text-muted-foreground/60"
                        )}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={tier.highlight ? "default" : "outline"}
                  className="w-full"
                  render={<Link href={tier.href} />}
                >
                  {tier.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Is my financial data safe?",
    a: "Yes. All data is encrypted at rest and in transit. We never sell or share your data with third parties. You can delete your account and all associated data at any time from Settings.",
  },
  {
    q: "Which banks are supported?",
    a: "BillBrain supports CSV and PDF exports from all major Indian banks including HDFC, SBI, ICICI, Axis, Kotak, and more. SMS-forwarded transaction alerts and email receipts are also supported.",
  },
  {
    q: "Does BillBrain read my bank account directly?",
    a: "No. BillBrain never connects to your bank directly. You manually export and upload statements. This means your banking credentials stay entirely with your bank.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "Pattern detection (subscriptions, leak types) is rule-based and highly accurate. AI assistant responses are grounded in your actual transaction data. We recommend treating insights as a starting point, not definitive financial advice.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, cancel at any time from your Settings page. You keep access until the end of your current billing period. No cancellation fees.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Common questions</h2>
        </Reveal>

        <Reveal>
          <div className="divide-y divide-border/50">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="py-4">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 text-left group"
                >
                  <span className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                      open === i && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-[13px] text-muted-foreground leading-relaxed">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-surface-1/30">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          {/* Brand */}
          <div className="space-y-2 max-w-xs">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-[14px]">
                BillBrain<span className="text-primary"> AI</span>
              </span>
            </Link>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              AI-powered personal finance intelligence for India.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-12 text-[13px]">
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Product
              </p>
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
              ].map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Account
              </p>
              {[
                { label: "Sign In", href: "/sign-in" },
                { label: "Get Started", href: "/sign-up" },
                { label: "Dashboard", href: "/dashboard" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="block text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* Disclaimer */}
        <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/60 max-w-md leading-relaxed">
            <Shield className="inline h-3 w-3 mr-1 mb-0.5" />
            BillBrain AI provides informational insights only, not professional financial advice. Always
            consult a qualified financial advisor before making significant financial decisions.
          </p>
          <p className="text-[11px] text-muted-foreground/40 shrink-0">
            © {new Date().getFullYear()} BillBrain AI
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ scrollBehavior: "smooth" }}>
      <Navbar isLoggedIn={isLoggedIn} />
      <Hero isLoggedIn={isLoggedIn} />
      <StatsBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FaqSection />
      <Footer />
    </div>
  );
}
