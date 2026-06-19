import type { AIMessage, AIResponse, AIProviderInterface } from "./types";

// ─── Context extraction helpers ───────────────────────────────────────────────

function num(s: string | undefined): string {
  return s ? s.replace(/[^\d,.]/g, "").trim() : "—";
}

interface CtxMetrics {
  totalSpend: string;
  savingsScore: string;
  subCount: string;
  subMonthly: string;
  topCategory: string;
  lateNightOrders: string;
}

function extractMetrics(system: string): CtxMetrics {
  return {
    totalSpend:      num(system.match(/Total spend:\s*₹([\d,]+)/)?.[1]),
    savingsScore:    system.match(/Savings score:\s*(\d+)/)?.[1] ?? "—",
    subCount:        system.match(/SUBSCRIPTIONS?\s*\((\d+)\s*active\)/i)?.[1] ?? "—",
    subMonthly:      num(system.match(/subscriptions.*?₹([\d,]+)\/mo/i)?.[1]),
    topCategory:     system.match(/Category #1[:\s]+([A-Za-z &]+)/i)?.[1]?.trim() ?? "Shopping",
    lateNightOrders: system.match(/(\d+)\s*late.?night/i)?.[1] ?? "0",
  };
}

// ─── Canned response templates ────────────────────────────────────────────────

function respondSubscription(m: CtxMetrics): string {
  const subs  = m.subCount  !== "—" ? m.subCount  : "several";
  const cost  = m.subMonthly !== "—" ? `₹${m.subMonthly}/month` : "a notable amount";
  return (
    `You have ${subs} active subscriptions costing ${cost}. ` +
    `Here's how to audit them:\n\n` +
    `1. **Find duplicates** — streaming services like Netflix, Prime, and Hotstar often overlap. Keeping one saves ₹1,500–3,600/year.\n` +
    `2. **Check dormant ones** — subscriptions unused for 45+ days are money leaks. Cancel immediately.\n` +
    `3. **Annual vs monthly billing** — switching to annual plans typically saves 15–20%.\n\n` +
    `Would you like me to list the specific subscriptions ranked by annual cost?`
  );
}

function respondFood(m: CtxMetrics): string {
  const lateNight = parseInt(m.lateNightOrders) > 0
    ? `I also spotted ${m.lateNightOrders} late-night delivery orders — these attract surge pricing (20–30% extra). `
    : "";
  return (
    `Your food & dining spend is one of the most common budget leaks. ${lateNight}` +
    `Practical steps to reduce it:\n\n` +
    `1. **Cap delivery orders** — set a weekly limit of 2 delivery orders and cook the rest.\n` +
    `2. **Avoid late-night orders** — plan a quick meal prep on Sunday to avoid midnight impulse orders.\n` +
    `3. **Use subscription credits** — Swiggy One and Zomato Gold give free deliveries and discounts.\n\n` +
    `A realistic 30% cut in food delivery spend could save ₹500–2,000/month depending on your usage.`
  );
}

function respondSavings(m: CtxMetrics): string {
  const score   = m.savingsScore !== "—" ? ` Your current savings score is ${m.savingsScore}/100.` : "";
  const spend   = m.totalSpend   !== "—" ? ` with a total spend of ₹${m.totalSpend} this month` : "";
  return (
    `Based on your data${spend}, here are three actionable ways to save:${score}\n\n` +
    `1. **Cancel unused subscriptions** — even 2 cancellations typically free up ₹1,500–3,600/year.\n` +
    `2. **Cut late-night food delivery** — ordering after 11 pm adds surge charges. Reducing this saves ₹500–1,200/month.\n` +
    `3. **Review ${m.topCategory} spend** — this is your fastest-growing category. Setting a monthly cap can prevent spikes.\n\n` +
    `Start with #1 — it's a one-time action with immediate recurring impact.`
  );
}

function respondLeaks(m: CtxMetrics): string {
  const spend = m.totalSpend !== "—" ? `₹${m.totalSpend}` : "your budget";
  return (
    `I've identified the most common leak patterns in ${spend}:\n\n` +
    `• **Late-night food delivery** — surge pricing inflates every order by 20–30%.\n` +
    `• **Micro-subscription stack** — small recurring charges (₹99–199) that individually seem trivial but stack up.\n` +
    `• **Impulse e-commerce sessions** — 3+ small purchases in one sitting on Amazon/Flipkart.\n` +
    `• **Convenience clustering** — visiting the same café or store daily as a habit.\n\n` +
    `The biggest lever is almost always subscriptions. Want a detailed breakdown of yours?`
  );
}

function respondSpend(m: CtxMetrics): string {
  const spend = m.totalSpend !== "—" ? `₹${m.totalSpend}` : "your monthly total";
  const score = m.savingsScore !== "—" ? ` (savings score: ${m.savingsScore}/100)` : "";
  return (
    `Your total spend this month is ${spend}${score}. ` +
    `Your highest category is **${m.topCategory}**.\n\n` +
    `Key observations:\n` +
    `• Subscriptions: ${m.subCount !== "—" ? m.subCount : "several"} active, ₹${m.subMonthly !== "—" ? m.subMonthly : "—"}/month combined.\n` +
    `• Late-night orders: ${m.lateNightOrders} detected this period.\n\n` +
    `What would you like to dig into — categories, subscriptions, or unusual charges?`
  );
}

function respondDefault(m: CtxMetrics): string {
  const spend = m.totalSpend !== "—" ? `₹${m.totalSpend}` : "your recent transactions";
  return (
    `Based on your financial data (total spend: ${spend}), I can help you with:\n\n` +
    `• **Subscription audit** — you have ${m.subCount !== "—" ? m.subCount : "several"} active subscriptions.\n` +
    `• **Spending patterns** — your top category is ${m.topCategory}.\n` +
    `• **Money leaks** — late-night orders, habit spend, duplicate charges.\n` +
    `• **Savings goals** — targeted cuts based on your data.\n\n` +
    `What would you like to focus on?`
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class DemoProvider implements AIProviderInterface {
  readonly providerName = "DEMO" as const;

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    const system   = messages.find((m) => m.role === "system")?.content ?? "";
    const userMsgs = messages.filter((m) => m.role === "user");
    const lastUser = userMsgs[userMsgs.length - 1]?.content?.toLowerCase() ?? "";
    const metrics  = extractMetrics(system);

    let text: string;

    if (/subscription|recurring|netflix|spotify|prime|hotstar|cult\.?fit/i.test(lastUser)) {
      text = respondSubscription(metrics);
    } else if (/food|delivery|zomato|swiggy|late.?night|order/i.test(lastUser)) {
      text = respondFood(metrics);
    } else if (/save|saving|reduce|cut|optimis|budget/i.test(lastUser)) {
      text = respondSavings(metrics);
    } else if (/leak|waste|avoidable|habit|impulse/i.test(lastUser)) {
      text = respondLeaks(metrics);
    } else if (/spend|spent|total|how much|categor|breakdown/i.test(lastUser)) {
      text = respondSpend(metrics);
    } else {
      text = respondDefault(metrics);
    }

    // Small simulated delay so the UI doesn't feel instant
    await new Promise((r) => setTimeout(r, 600));

    return { text, tokensUsed: 0 };
  }
}
