import { describe, it, expect } from "vitest";
import { forecastSpend } from "../lib/analytics/spendingForecast";

describe("forecastSpend", () => {
  it("returns null for fewer than 3 months", () => {
    expect(forecastSpend([])).toBeNull();
    expect(forecastSpend([5000])).toBeNull();
    expect(forecastSpend([5000, 6000])).toBeNull();
  });

  it("returns a result for exactly 3 months", () => {
    const result = forecastSpend([10000, 10000, 10000]);
    expect(result).not.toBeNull();
  });

  it("detects STABLE trend when spend is flat", () => {
    const result = forecastSpend([10000, 10000, 10000, 10000, 10000, 10000]);
    expect(result?.trend).toBe("STABLE");
  });

  it("detects RISING trend on consistently increasing spend", () => {
    const result = forecastSpend([5000, 8000, 11000, 14000, 17000, 20000]);
    expect(result?.trend).toBe("RISING");
    expect(result?.trendPercent).toBeGreaterThan(0);
  });

  it("detects FALLING trend on consistently decreasing spend", () => {
    const result = forecastSpend([20000, 17000, 14000, 11000, 8000, 5000]);
    expect(result?.trend).toBe("FALLING");
    expect(result?.trendPercent).toBeLessThan(0);
  });

  it("confidence is HIGH for 6 months of data", () => {
    const result = forecastSpend([10000, 10000, 10000, 10000, 10000, 10000]);
    expect(result?.confidence).toBe("HIGH");
  });

  it("confidence is MEDIUM for 4–5 months of data", () => {
    expect(forecastSpend([10000, 10000, 10000, 10000])?.confidence).toBe("MEDIUM");
    expect(forecastSpend([10000, 10000, 10000, 10000, 10000])?.confidence).toBe("MEDIUM");
  });

  it("confidence is LOW for exactly 3 months", () => {
    expect(forecastSpend([10000, 10000, 10000])?.confidence).toBe("LOW");
  });

  it("predictedSpend is always ≥ 0", () => {
    const result = forecastSpend([50000, 5000, 1000]);
    expect(result?.predictedSpend).toBeGreaterThanOrEqual(0);
  });

  it("lowerBound ≤ predictedSpend ≤ upperBound", () => {
    const result = forecastSpend([10000, 12000, 11000, 13000, 12000, 14000]);
    expect(result).not.toBeNull();
    expect(result!.lowerBound).toBeLessThanOrEqual(result!.predictedSpend);
    expect(result!.predictedSpend).toBeLessThanOrEqual(result!.upperBound);
  });

  it("predicts higher than current for strongly rising spend", () => {
    const result = forecastSpend([1000, 3000, 5000, 7000, 9000, 11000]);
    expect(result?.predictedSpend).toBeGreaterThan(11000);
  });
});
