"use client";

import { useState, useEffect, useMemo } from "react";
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
  Sparkles,
  Repeat2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const GITHUB_URL = "https://github.com/ProDeveloperAditya/BillBrain";

// GitHub mark (lucide removed brand icons; inline SVG is the correct way to render a logo)
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────────────────────

function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between h-16 px-5 md:px-8 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl brand-gradient">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-base tracking-tight">
          BillBrain<span className="text-primary"> AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          className="hidden sm:inline-flex"
        >
          <GithubIcon className="mr-1.5 h-4 w-4" />
          GitHub
        </Button>
        {isLoggedIn ? (
          <Button size="sm" render={<Link href="/dashboard" />}>
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
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
// HERO — aurora background + rotating word
// ─────────────────────────────────────────────────────────────────────────────

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [wordIndex, setWordIndex] = useState(0);
  const words = useMemo(() => ["leaks", "hides", "slips", "vanishes", "drains"], []);

  useEffect(() => {
    const id = setTimeout(
      () => setWordIndex((i) => (i === words.length - 1 ? 0 : i + 1)),
      2000
    );
    return () => clearTimeout(id);
  }, [wordIndex, words]);

  return (
    <AuroraBackground className="min-h-screen pt-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-7 max-w-4xl px-4 text-center"
      >
        {/* Honest badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Free · Open source · No bank login required
        </div>

        {/* Headline with rotating word */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.05]">
          Find where your money{" "}
          <span className="relative inline-flex justify-center overflow-hidden align-bottom h-[1.1em] w-[5ch] md:w-[6.5ch]">
            {words.map((word, index) => (
              <motion.span
                key={word}
                className="absolute gradient-text font-bold"
                initial={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
                animate={
                  wordIndex === index
                    ? { y: 0, opacity: 1 }
                    : { y: wordIndex > index ? "-120%" : "120%", opacity: 0 }
                }
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl leading-relaxed">
          BillBrain AI maps your spending, hunts down forgotten subscriptions, and
          flags avoidable “money leaks” — grounded in your own transactions, not generic advice.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
          <Button size="lg" className="h-11 px-5 text-base" render={<Link href={isLoggedIn ? "/dashboard" : "/sign-in"} />}>
            Try the live demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-5 text-base"
            render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
          >
            <GithubIcon className="mr-2 h-4 w-4" />
            View the code
          </Button>
        </div>

        {/* Live demo credentials — honest, recruiter-friendly */}
        <div className="mt-1 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface-1/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          <span className="text-foreground/80 font-medium">Demo login</span>
          <code className="font-mono text-primary">demo@billbrain.ai</code>
          <span className="text-border">·</span>
          <code className="font-mono text-primary">demo1234</code>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PREVIEW (inside the scroll card) — a faithful UI mock, not fake data
// ─────────────────────────────────────────────────────────────────────────────

function PreviewKpi({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="surface-2 rounded-xl border border-border p-3 md:p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${color}22` }}>
          <Icon className="h-3 w-3" style={{ color }} />
        </span>
      </div>
      <span className="text-lg md:text-2xl font-bold tracking-tight tabular-nums">{value}</span>
      <span className="text-[10px] md:text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function DashboardPreview() {
  const cats = [
    { name: "Rent & Housing", pct: 42, color: "#ef4444" },
    { name: "Food & Dining", pct: 16, color: "#f97316" },
    { name: "Shopping", pct: 12, color: "#f59e0b" },
    { name: "Subscriptions", pct: 8, color: "#a855f7" },
    { name: "Coffee & Cafés", pct: 9, color: "#d97706" },
    { name: "Transport", pct: 6, color: "#6366f1" },
  ];
  return (
    <div className="h-full w-full overflow-hidden p-3 md:p-5 flex flex-col gap-3 md:gap-4 text-left">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg brand-gradient">
            <Brain className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground">Arjun Sharma</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
        <PreviewKpi label="Total spend" value="₹33,283" sub="April 2026" icon={TrendingDown} color="#6366f1" />
        <PreviewKpi label="Avoidable" value="₹6,140" sub="18% of spend" icon={Zap} color="#f59e0b" />
        <PreviewKpi label="Subscriptions" value="6" sub="₹2,464/mo" icon={Repeat2} color="#a855f7" />
        <PreviewKpi label="Savings score" value="72" sub="Good" icon={Check} color="#22c55e" />
      </div>

      {/* Chart + categories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
        {/* Area chart */}
        <div className="lg:col-span-3 surface-2 rounded-xl border border-border p-3 md:p-4 flex flex-col">
          <span className="text-xs font-semibold mb-2">Monthly Spend Trend</span>
          <div className="relative flex-1 min-h-[90px]">
            <svg viewBox="0 0 320 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,70 L64,52 L128,60 L192,30 L256,44 L320,24 L320,110 L0,110 Z" fill="url(#pv)" />
              <path d="M0,70 L64,52 L128,60 L192,30 L256,44 L320,24" fill="none" stroke="#6366f1" strokeWidth="2.5" />
              <path d="M0,86 L64,80 L128,82 L192,72 L256,78 L320,70" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#6366f1]" /> Total spend</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-[#a855f7]" /> Recurring</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-2 surface-2 rounded-xl border border-border p-3 md:p-4 flex flex-col">
          <span className="text-xs font-semibold mb-2.5">Category Breakdown</span>
          <div className="flex flex-col gap-2 justify-center flex-1">
            {cats.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-24 truncate shrink-0">{c.name}</span>
                <span className="h-1.5 rounded-full flex-1 bg-surface-3 overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${c.pct * 2.2}%`, background: c.color }} />
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground w-7 text-right">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOWCASE (3D scroll)
// ─────────────────────────────────────────────────────────────────────────────

function Showcase() {
  return (
    <div className="-mt-20 md:-mt-10">
      <ContainerScroll
        titleComponent={
          <div className="mb-2">
            <SectionLabel>The product</SectionLabel>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
              Your whole financial picture,
              <br />
              <span className="gradient-text">in one clear dashboard.</span>
            </h2>
          </div>
        }
      >
        <DashboardPreview />
      </ContainerScroll>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPABILITIES STRIP (real facts, replaces fake metrics)
// ─────────────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  { value: "6", label: "money-leak patterns detected" },
  { value: "4", label: "import formats: CSV · PDF · SMS · email" },
  { value: "18", label: "auto-tagged spending categories" },
  { value: "100-pt", label: "subscription confidence scoring" },
];

function CapabilitiesStrip() {
  return (
    <section className="border-y border-border/40 bg-surface-1/40">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {CAPABILITIES.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08}>
              <p className="text-3xl md:text-5xl font-bold gradient-text tabular-nums">{c.value}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-snug">{c.label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    color: "#a855f7",
    title: "Subscription Hunter",
    desc: "Surfaces every recurring charge — including the ones you forgot you were paying. Annual cost, dormant flags, and price-increase alerts.",
    points: ["Detects weekly → yearly cadences", "Flags price increases", "Catches dormant subscriptions"],
  },
  {
    icon: Zap,
    color: "#f59e0b",
    title: "Leak Detector",
    desc: "Finds six patterns of avoidable spend: late-night food orders, convenience clusters, impulse shopping, subscription stacks, and more.",
    points: ["Annualised impact per leak", "Ranked by severity", "A concrete fix for each pattern"],
  },
  {
    icon: Bot,
    color: "#6366f1",
    title: "AI Assistant",
    desc: "Ask plain-English questions about your finances and get answers grounded in your real transactions — not generic advice.",
    points: ["Retrieval over your own data", "Runs on OpenAI or Groq", "Conversation history saved"],
  },
];

function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-16">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your financial blind spots, illuminated
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg leading-relaxed">
            Three tools that work together to give you a complete, honest picture of your money.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.1}>
                <div
                  className="surface-2 border border-border rounded-2xl p-7 flex flex-col gap-4 h-full card-hover"
                  style={{ borderTopColor: f.color, borderTopWidth: 2 }}
                >
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.color}1f` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl text-foreground">{f.title}</h3>
                    <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                  </div>
                  <ul className="space-y-2 mt-auto pt-3 border-t border-border/50">
                    {f.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Upload, title: "Upload", desc: "Import bank statements as CSV, PDF, forwarded SMS, or email receipts — all formats supported." },
  { icon: BarChart3, title: "Analyze", desc: "BillBrain maps your spending, detects recurring patterns, and scores your savings potential automatically." },
  { icon: Zap, title: "Act", desc: "Get specific, ranked recommendations. Cancel the right subscriptions. Cut the right habits." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 border-t border-border/40 bg-surface-1/30">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-16">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            From statement to savings in minutes
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-9 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-border/0 via-border to-border/0" />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 0.12} className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-white brand-gradient rounded-full h-6 w-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{step.title}</h3>
                  <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed max-w-[240px] mx-auto">
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
// TECH STACK (replaces fake testimonials — recruiter-friendly + honest)
// ─────────────────────────────────────────────────────────────────────────────

const TECH = [
  "Next.js 16", "TypeScript", "PostgreSQL", "Prisma ORM", "Auth.js v5",
  "Tailwind CSS v4", "Recharts", "Framer Motion", "OpenAI", "Groq", "Vercel", "Neon",
];

const ENGINEERING = [
  { title: "Rule-based analytics engine", desc: "Six leak detectors and a recurring-charge detector with coefficient-of-variation scoring — deterministic, explainable, no black box." },
  { title: "Multi-format parsing pipeline", desc: "CSV, PDF, SMS and email parsers feed a normalization pipeline: merchant resolution, category tagging, and duplicate detection." },
  { title: "RAG-grounded assistant", desc: "A retrieval context builder feeds your real transactions to a pluggable LLM layer (OpenAI / Groq) with automatic fallback." },
];

function TechStack() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14">
          <SectionLabel>Under the hood</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Built like a real product</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            A full-stack TypeScript application — typed end to end, server components, server actions,
            and a Postgres data model with 18 tables.
          </p>
        </Reveal>

        {/* Engineering highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {ENGINEERING.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.1}>
              <div className="surface-2 border border-border rounded-2xl p-6 h-full">
                <h3 className="font-semibold text-lg text-foreground">{e.title}</h3>
                <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">{e.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Stack pills */}
        <Reveal className="flex flex-wrap justify-center gap-2.5">
          {TECH.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border bg-surface-1 px-4 py-1.5 text-sm text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA (replaces fake pricing)
// ─────────────────────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-24 px-4 border-t border-border/40 bg-surface-1/30">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
            See where <span className="gradient-text">your</span> money goes.
          </h2>
          <p className="text-muted-foreground mt-5 text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
            Try the live demo with seeded data, or create a free account and import your own statements.
            It’s free, open source, and never asks for your bank login.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-8">
            <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/sign-in" />}>
              Open the live demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base"
              render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}
            >
              <GithubIcon className="mr-2 h-4 w-4" />
              Star on GitHub
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Demo login: <code className="font-mono text-primary">demo@billbrain.ai</code> ·{" "}
            <code className="font-mono text-primary">demo1234</code>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Does BillBrain connect to my bank?",
    a: "No. BillBrain never connects to your bank and never asks for banking credentials. You export and upload statements yourself, so your login stays entirely with your bank.",
  },
  {
    q: "Is my financial data safe?",
    a: "Your data lives in your own account and is never sold or shared. Because there's no bank integration, there are no stored bank credentials to leak. You can delete your account and all data at any time.",
  },
  {
    q: "Which formats and banks are supported?",
    a: "CSV and PDF exports from major Indian banks (HDFC, SBI, ICICI, Axis, Kotak, and more), plus forwarded SMS transaction alerts and email receipts.",
  },
  {
    q: "How accurate is the analysis?",
    a: "Subscription and leak detection are rule-based and deterministic — every flag is explainable. AI assistant answers are grounded in your actual transactions. Treat insights as a starting point, not formal financial advice.",
  },
  {
    q: "Is it really free?",
    a: "Yes. BillBrain is a free, open-source project. The whole codebase is on GitHub.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Common questions</h2>
        </Reveal>

        <Reveal>
          <div className="divide-y divide-border/50">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="py-4">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 text-left group cursor-pointer"
                >
                  <span className="text-base md:text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
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
                      <p className="pt-3 text-[15px] text-muted-foreground leading-relaxed">
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
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-surface-1/30">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="space-y-3 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl brand-gradient">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-base">
                BillBrain<span className="text-primary"> AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A free, open-source personal-finance intelligence project.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubIcon className="h-4 w-4" /> View source
            </a>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Explore</p>
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "FAQ", href: "#faq" },
              ].map((l) => (
                <a key={l.label} href={l.href} className="block text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              ))}
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Account</p>
              {[
                { label: "Sign In", href: "/sign-in" },
                { label: "Get Started", href: "/sign-up" },
                { label: "Dashboard", href: "/dashboard" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="block text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground/60 max-w-md leading-relaxed">
            <Shield className="inline h-3 w-3 mr-1 mb-0.5" />
            BillBrain provides informational insights only, not professional financial advice.
          </p>
          <p className="text-xs text-muted-foreground/40 shrink-0">
            © {new Date().getFullYear()} BillBrain AI · Open source
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
      <Showcase />
      <CapabilitiesStrip />
      <Features />
      <HowItWorks />
      <TechStack />
      <CtaSection />
      <FaqSection />
      <Footer />
    </div>
  );
}
