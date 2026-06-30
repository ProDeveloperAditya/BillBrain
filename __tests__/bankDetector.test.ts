import { describe, it, expect } from "vitest";
import { detectBank } from "../lib/parsers/bankDetector";

describe("detectBank", () => {
  it("identifies SBI from 'State Bank of India' in header", () => {
    const text = "State Bank of India Account Statement January 2026";
    expect(detectBank(text)).toBe("SBI");
  });

  it("identifies SBI from 'SBI YONO' keyword", () => {
    const text = "YONO SBI - Your Digital Banking Partner | Statement";
    expect(detectBank(text)).toBe("SBI");
  });

  it("identifies HDFC from 'HDFC Bank'", () => {
    const text = "HDFC Bank Account Statement — Savings Account";
    expect(detectBank(text)).toBe("HDFC");
  });

  it("identifies ICICI from 'ICICI Bank'", () => {
    const text = "ICICI Bank Personal Account Statement";
    expect(detectBank(text)).toBe("ICICI");
  });

  it("identifies AXIS from 'Axis Bank'", () => {
    const text = "Axis Bank — Transaction History";
    expect(detectBank(text)).toBe("AXIS");
  });

  it("identifies KOTAK from 'Kotak Mahindra Bank'", () => {
    const text = "Kotak Mahindra Bank Statement of Account";
    expect(detectBank(text)).toBe("KOTAK");
  });

  it("returns UNKNOWN for unrecognized text", () => {
    const text = "Random PDF content with no bank name whatsoever";
    expect(detectBank(text)).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for empty string", () => {
    expect(detectBank("")).toBe("UNKNOWN");
  });

  it("only checks the first 2000 chars — ignores bank name later in document", () => {
    const longPreamble = "X".repeat(2001);
    const text = longPreamble + "HDFC Bank";
    expect(detectBank(text)).toBe("UNKNOWN");
  });
});
