/**
 * HDFC Bank statement parser.
 *
 * Typical HDFC layout (text layer, merged pages):
 *   Date  Narration  Chq/Ref No  Value Dt  Withdrawal Amt  Deposit Amt  Closing Balance
 *   01/04/26  UPI-ZOMATO-...  000123456  01/04/26  520.00          48,230.50
 *   03/04/26  NEFT CR-SALARY-XYZ CORP     03/04/26          75000.00  1,23,230.50
 *
 * Dates: DD/MM/YY or DD/MM/YYYY. Columns: Withdrawal (debit) / Deposit (credit) / Balance.
 * Shares the generic columnar core with ICICI / Axis / Kotak.
 */

import type { ParsedTransaction } from "./types";
import { parseColumnar, parseDmyFlexible } from "./columnarAdapter";

export function parseHdfc(text: string): ParsedTransaction[] {
  return parseColumnar(text, {
    dateRe: /\b(\d{2}\/\d{2}\/\d{2,4})\b/,
    parseDate: parseDmyFlexible,
    headerRe: /Narration\s+Chq|Withdrawal\s+Amt|Deposit\s+Amt|Narration.*Balance/i,
    confidence: 0.85,
  });
}
