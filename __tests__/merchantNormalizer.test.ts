import { describe, it, expect } from "vitest";
import { normalizeRaw } from "../lib/normalization/merchantNormalizer";

describe("normalizeRaw", () => {
  it("extracts Zomato from a UPI/DR string", () => {
    const result = normalizeRaw("UPI/DR/123456789012/Zomato/HDFCBANK/zomato@hdfcbank/Food");
    expect(result.merchantName).toBe("Zomato");
    expect(result.normalizedName).toBe("zomato");
  });

  it("extracts Netflix from a plain description", () => {
    const result = normalizeRaw("Netflix Monthly Subscription");
    expect(result.merchantName).toBe("Netflix");
  });

  it("extracts Blue Tokai from a description", () => {
    const result = normalizeRaw("Blue Tokai Coffee payment");
    expect(result.merchantName).toBe("Blue Tokai Coffee");
  });

  it("extracts Amazon from a noisy description", () => {
    const result = normalizeRaw("Amazon purchase order #12345 payment");
    expect(result.merchantName).toBe("Amazon");
  });

  it("extracts Spotify from UPI VPA", () => {
    const result = normalizeRaw("UPI/DR/999/SPOTIFY/AXIS/spotify@axisbank/Music");
    expect(result.merchantName).toBe("Spotify");
  });

  it("normalizedName is always lowercase", () => {
    const result = normalizeRaw("Netflix");
    expect(result.normalizedName).toBe(result.normalizedName.toLowerCase());
  });

  it("returns a non-empty fallback for unrecognized strings", () => {
    const result = normalizeRaw("XYZZY UNKNOWN VENDOR 99999");
    expect(result.merchantName.length).toBeGreaterThan(0);
    expect(result.normalizedName.length).toBeGreaterThan(0);
  });

  it("handles plain 'salary' text without crashing", () => {
    const result = normalizeRaw("SALARY CREDIT NEFT");
    expect(result.merchantName).toBeTruthy();
  });
});
