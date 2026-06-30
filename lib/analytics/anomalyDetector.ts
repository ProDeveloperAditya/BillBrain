/**
 * Per-category z-score anomaly detection.
 * Pure function — no DB dependency, safe to unit-test directly.
 *
 * Algorithm:
 *   For each category, compute mean + population std-dev over all prior months
 *   (i.e. every element except the last). Then:
 *     z = (currentAmount - mean) / stdDev
 *     z ≥ 2 → WARNING
 *     z ≥ 3 → CRITICAL
 *
 * Requires ≥ 3 data points (2 prior months + current) so std-dev is meaningful.
 * Categories with mean = 0 or std-dev < ₹1 are skipped (stable / always zero).
 */

export interface CategoryHistory {
  /** Prisma CategoryName string, e.g. "FOOD_DINING" */
  category: string;
  /**
   * Monthly spend amounts in chronological order — oldest first.
   * The LAST element is the current (target) month being evaluated.
   */
  monthlyAmounts: number[];
}

export interface AnomalyResult {
  category: string;
  currentAmount: number;
  /** Mean of all prior months (all elements except the last). */
  expectedAmount: number;
  stdDev: number;
  zScore: number;
  severity: "WARNING" | "CRITICAL";
  /** ((currentAmount - expectedAmount) / expectedAmount) × 100, rounded. */
  percentAboveNorm: number;
}

/**
 * @param histories  Per-category spend histories. Must include current month as last element.
 * @param minMonths  Minimum total length required before flagging (default 3 = 2 prior + current).
 * @returns Anomalies sorted by z-score descending (highest first).
 */
export function detectAnomalies(
  histories: CategoryHistory[],
  minMonths = 3,
): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  for (const { category, monthlyAmounts } of histories) {
    if (monthlyAmounts.length < minMonths) continue;

    const current = monthlyAmounts[monthlyAmounts.length - 1];
    const prior   = monthlyAmounts.slice(0, -1);

    const mean = prior.reduce((s, v) => s + v, 0) / prior.length;
    if (mean <= 0) continue;

    // Population variance over prior months
    const variance = prior.reduce((s, v) => s + (v - mean) ** 2, 0) / prior.length;
    const stdDev   = Math.sqrt(variance);
    if (stdDev < 1) continue; // < ₹1 variance — spending is perfectly stable

    const zScore = (current - mean) / stdDev;
    if (zScore < 2) continue;

    results.push({
      category,
      currentAmount:    Math.round(current),
      expectedAmount:   Math.round(mean),
      stdDev:           Math.round(stdDev),
      zScore:           Math.round(zScore * 10) / 10,
      severity:         zScore >= 3 ? "CRITICAL" : "WARNING",
      percentAboveNorm: Math.round(((current - mean) / mean) * 100),
    });
  }

  return results.sort((a, b) => b.zScore - a.zScore);
}

/**
 * Convenience: build CategoryHistory[] from a map of
 *   category → [month0spend, month1spend, …, currentMonthSpend]
 */
export function buildHistories(
  spendByCategory: Record<string, number[]>,
): CategoryHistory[] {
  return Object.entries(spendByCategory).map(([category, monthlyAmounts]) => ({
    category,
    monthlyAmounts,
  }));
}
