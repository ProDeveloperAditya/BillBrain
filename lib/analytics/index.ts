// Analytics services — Phase 2
// Spending aggregation, category analysis, trend detection

export interface SpendingSummary {
  totalSpend: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  monthOverMonth: number;
  recurringTotal: number;
}

export async function getMonthlySpend(
  _userId: string,
  _month: Date
): Promise<SpendingSummary> {
  // TODO Phase 2
  return {
    totalSpend: 0,
    topCategories: [],
    monthOverMonth: 0,
    recurringTotal: 0,
  };
}
