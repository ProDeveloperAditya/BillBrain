/**
 * Kotak Mahindra Bank statement parser.
 *
 * Typical Kotak layout (text layer, merged pages):
 *   Date  Narration  Chq/Ref No  Withdrawal(Dr)  Deposit(Cr)  Balance
 *   05-04-2026  UPI/Blinkit/...  -  640.00   47,590.50
 *   07-04-2026  SALARY CREDIT-ACME  -   65,000.00  1,12,590.50
 *
 * Dates: DD-MM-YYYY or DD/MM/YYYY. Columns: Withdrawal (debit) / Deposit (credit) / Balance.
 */

import type { ParsedTransaction } from "./types";
import { parseColumnar, parseDmyFlexible } from "./columnarAdapter";

export function parseKotak(text: string): ParsedTransaction[] {
  return parseColumnar(text, {
    dateRe: /\b(\d{2}[-/]\d{2}[-/]\d{2,4})\b/,
    parseDate: parseDmyFlexible,
    headerRe: /Withdrawal.*Deposit|Narration.*Balance|Dr\s*\/\s*Cr|Chq.*Balance/i,
    confidence: 0.85,
  });
}
