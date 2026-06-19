// Demo data layer — realistic sample data for demo mode
// Phase 2 will populate this with full seed data

export const DEMO_USER = {
  id: "demo-user",
  name: "Alex Johnson",
  email: "demo@billbrain.ai",
  currency: "INR",
};

export const DEMO_KPI = {
  totalSpendThisMonth: 42380,
  avoidableSpend: 8140,
  activeSubscriptions: 11,
  unusualAlerts: 5,
  savingsScore: 68,
};

export const DEMO_CATEGORIES = [
  { name: "Food & Dining", amount: 12400, color: "#10b981" },
  { name: "Subscriptions", amount: 3299, color: "#14b8a6" },
  { name: "Shopping", amount: 8200, color: "#6366f1" },
  { name: "Transport", amount: 4100, color: "#f59e0b" },
  { name: "Utilities", amount: 6200, color: "#8b5cf6" },
  { name: "Other", amount: 8181, color: "#64748b" },
];

export const DEMO_MONTHLY_TREND = [
  { month: "Nov", amount: 38200 },
  { month: "Dec", amount: 52400 },
  { month: "Jan", amount: 41200 },
  { month: "Feb", amount: 39800 },
  { month: "Mar", amount: 44100 },
  { month: "Apr", amount: 42380 },
];
