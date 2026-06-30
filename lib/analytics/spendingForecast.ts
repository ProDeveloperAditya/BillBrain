/**
 * Weighted Linear Regression (WLS) spend forecast.
 * Pure function — no DB dependency, safe to unit-test directly.
 *
 * Model: y = a + b·x  where x = month index (0 = oldest, n-1 = current month)
 * Weights: w_i = ALPHA^(n-1-i)  — most-recent month always has weight 1;
 *          older months decay exponentially.
 *
 * Prediction: x = n  (one month ahead of the latest data point)
 * Confidence band: ±Z_80 · weighted residual std-error (80% interval, z = 1.28)
 */

export interface ForecastResult {
  /** Predicted debit total for next month (≥ 0). */
  predictedSpend: number;
  /** 80% confidence lower bound. */
  lowerBound: number;
  /** 80% confidence upper bound. */
  upperBound: number;
  /** Direction vs the most-recent actual month. */
  trend: "RISING" | "FALLING" | "STABLE";
  /** Percent change from last actual to predicted (rounded). */
  trendPercent: number;
  /** Data quality: HIGH = 6+ months, MEDIUM = 4–5, LOW = 3. */
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

/** Recency decay factor: most-recent month weight = 1, each prior step × ALPHA. */
const ALPHA = 0.85;
/** z-score for 80% confidence interval. */
const Z_80  = 1.28;
/** |trendPercent| below this threshold is treated as STABLE. */
const STABLE_THRESHOLD = 5;

/**
 * @param monthlyTotals  Debit totals per month, chronological order (oldest first).
 *                       Current month is the last element.
 * @returns ForecastResult, or null when fewer than 3 months provided.
 */
export function forecastSpend(monthlyTotals: number[]): ForecastResult | null {
  const n = monthlyTotals.length;
  if (n < 3) return null;

  const weights = monthlyTotals.map((_, i) => Math.pow(ALPHA, n - 1 - i));
  const xs      = monthlyTotals.map((_, i) => i);
  const ys      = monthlyTotals;

  // Weighted sums for normal equations
  let sumW = 0, sumWx = 0, sumWy = 0, sumWxx = 0, sumWxy = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    sumW   += w;
    sumWx  += w * xs[i];
    sumWy  += w * ys[i];
    sumWxx += w * xs[i] * xs[i];
    sumWxy += w * xs[i] * ys[i];
  }

  const det = sumW * sumWxx - sumWx * sumWx;
  if (Math.abs(det) < 1e-9) return null; // degenerate (all x identical — shouldn't happen)

  const b = (sumW * sumWxy - sumWx * sumWy) / det; // slope
  const a = (sumWy - b * sumWx) / sumW;             // intercept

  const predictedSpend = Math.max(0, Math.round(a + b * n));

  // Weighted residual standard error
  let wss = 0;
  for (let i = 0; i < n; i++) {
    const residual = ys[i] - (a + b * xs[i]);
    wss += weights[i] * residual * residual;
  }
  const se     = Math.sqrt(wss / Math.max(1, n - 2));
  const margin = Z_80 * se;

  const lowerBound = Math.max(0, Math.round(predictedSpend - margin));
  const upperBound = Math.round(predictedSpend + margin);

  const current      = ys[n - 1];
  const trendPercent =
    current > 0
      ? Math.round(((predictedSpend - current) / current) * 100)
      : 0;

  const trend: ForecastResult["trend"] =
    Math.abs(trendPercent) < STABLE_THRESHOLD ? "STABLE"
    : trendPercent > 0                         ? "RISING"
    :                                            "FALLING";

  const confidence: ForecastResult["confidence"] =
    n >= 6 ? "HIGH" : n >= 4 ? "MEDIUM" : "LOW";

  return { predictedSpend, lowerBound, upperBound, trend, trendPercent, confidence };
}
