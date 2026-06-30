/**
 * ICICI Bank statement parser.
 *
 * Typical ICICI layout (text layer, merged pages):
 *   Date  Mode  Particulars  Deposits  Withdrawals  Balance
 *   05-04-2026  UPI  UPI/Zomato/...  -  520.00  48,230.50
 *   07-04-2026  NEFT  NEFT-CR-SALARY-...  65,000.00  -  1,13,000.50
 *
 * Dates: DD-MM-YYYY. Columns: Withdrawals (debit) / Deposits (credit) / Balance.
 */

import type { ParsedTransaction } from "./types";
import { parseColumnar, parseDmyFull } from "./columnarAdapter";

export function parseIcici(text: string): ParsedTransaction[] {
  return parseColumnar(text, {
    dateRe: /\b(\d{2}[-/]\d{2}[-/]\d{4})\b/,
    parseDate: parseDmyFull,
    headerRe: /Withdrawals?\s+Deposits?|Particulars.*Balance|Transaction\s+Remarks/i,
    confidence: 0.85,
  });
}
