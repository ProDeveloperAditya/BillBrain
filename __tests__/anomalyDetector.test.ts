import { describe, it, expect } from "vitest";
import { detectAnomalies, buildHistories, type CategoryHistory } from "../lib/analytics/anomalyDetector";

describe("detectAnomalies", () => {
  it("returns empty array when fewer than 3 months of data", () => {
    const h: CategoryHistory[] = [{ category: "FOOD_DINING", monthlyAmounts: [1000, 1200] }];
    expect(detectAnomalies(h)).toEqual([]);
  });

  it("returns empty array when z-score is below 2", () => {
    // consistent spend → z = 0
    const h: CategoryHistory[] = [{ category: "FOOD_DINING", monthlyAmounts: [1000, 1000, 1000, 1000] }];
    expect(detectAnomalies(h)).toEqual([]);
  });

  it("flags WARNING when 2 ≤ z < 3", () => {
    // prior months: 1000, 1000 → mean=1000, std=0 — need variance
    // prior: 800, 1200 → mean=1000, std=200; current=1410 → z=2.05
    const h: CategoryHistory[] = [{ category: "FOOD_DINING", monthlyAmounts: [800, 1200, 1410] }];
    const result = detectAnomalies(h);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("WARNING");
  });

  it("flags CRITICAL when z ≥ 3", () => {
    // prior: 800, 1200 → mean=1000, std=200; current=1620 → z=3.1
    const h: CategoryHistory[] = [{ category: "FOOD_DINING", monthlyAmounts: [800, 1200, 1620] }];
    const result = detectAnomalies(h);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CRITICAL");
  });

  it("skips categories with mean = 0", () => {
    const h: CategoryHistory[] = [{ category: "TRAVEL", monthlyAmounts: [0, 0, 5000] }];
    expect(detectAnomalies(h)).toEqual([]);
  });

  it("skips categories where std-dev < 1 (perfectly stable)", () => {
    const h: CategoryHistory[] = [{ category: "RENT_HOUSING", monthlyAmounts: [20000, 20000, 25000] }];
    // mean=20000, stdDev=0 → skipped
    expect(detectAnomalies(h)).toEqual([]);
  });

  it("sorts results by z-score descending", () => {
    const histories: CategoryHistory[] = [
      { category: "FOOD_DINING",   monthlyAmounts: [800, 1200, 1410] }, // z ≈ 2.05
      { category: "COFFEE_CAFES",  monthlyAmounts: [400, 600, 1200] },  // z ≈ 4.0
    ];
    const result = detectAnomalies(histories);
    expect(result[0].category).toBe("COFFEE_CAFES");
    expect(result[0].zScore).toBeGreaterThan(result[1].zScore);
  });

  it("computes percentAboveNorm correctly", () => {
    // prior: 800, 1200 → mean=1000; current=1500 → 50% above
    const h: CategoryHistory[] = [{ category: "SHOPPING", monthlyAmounts: [800, 1200, 1500] }];
    const result = detectAnomalies(h);
    expect(result[0].percentAboveNorm).toBe(50);
  });

  it("returns correct expectedAmount (mean of prior months)", () => {
    const h: CategoryHistory[] = [{ category: "FOOD_DINING", monthlyAmounts: [800, 1200, 1410] }];
    const result = detectAnomalies(h);
    expect(result[0].expectedAmount).toBe(1000); // (800+1200)/2
  });

  it("handles 6 months of history correctly", () => {
    // prior 5 months with natural variance; current = 4× normal → z >> 3
    const h: CategoryHistory[] = [{
      category: "SHOPPING",
      monthlyAmounts: [900, 1100, 950, 1050, 1000, 4000],
    }];
    const result = detectAnomalies(h);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CRITICAL");
    expect(result[0].zScore).toBeGreaterThanOrEqual(3);
  });
});

describe("buildHistories", () => {
  it("converts a category→amounts map to CategoryHistory[]", () => {
    const map = { FOOD_DINING: [1000, 1200, 1400] };
    const result = buildHistories(map);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("FOOD_DINING");
    expect(result[0].monthlyAmounts).toEqual([1000, 1200, 1400]);
  });
});
