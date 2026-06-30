/**
 * Bank fingerprinting from raw PDF text.
 * Inspects only the first 2000 characters (cover page / header) for speed.
 */

export type BankName = "SBI" | "HDFC" | "ICICI" | "AXIS" | "KOTAK" | "UNKNOWN";

const FINGERPRINTS: Array<{ bank: BankName; pattern: RegExp }> = [
  { bank: "SBI",   pattern: /state\s+bank\s+of\s+india|sbi\s+yono|yono\s+sbi/i },
  { bank: "HDFC",  pattern: /hdfc\s+bank|hdfcbank\.com/i },
  { bank: "ICICI", pattern: /icici\s+bank|icicidirect\.com/i },
  { bank: "AXIS",  pattern: /axis\s+bank|axisbank\.com/i },
  { bank: "KOTAK", pattern: /kotak\s+mahindra\s+bank|kotakbank\.com/i },
];

/**
 * @param text  Full extracted PDF text (mergePages: true).
 * @returns Detected bank name, or "UNKNOWN" if no fingerprint matches.
 */
export function detectBank(text: string): BankName {
  const header = text.slice(0, 2000);
  for (const { bank, pattern } of FINGERPRINTS) {
    if (pattern.test(header)) return bank;
  }
  return "UNKNOWN";
}
