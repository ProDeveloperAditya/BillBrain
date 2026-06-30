/**
 * Axis Bank statement parser.
 *
 * Typical Axis layout (text layer, merged pages):
 *   Tran Date  Particulars  Debit  Credit  Balance
 *   05-04-2026  UPI/P2M/Swiggy/...  450.00   48,230.50
 *   07-04-2026  NEFT/SALARY/ACME/...        65,000.00  1,13,230.50
 *
 * Dates: DD-MM-YYYY. Columns: Debit / Credit / Balance.
 */

import type { ParsedTransaction } from "./types";
import { parseColumnar, parseDmyFull } from "./columnarAdapter";

export function parseAxis(text: string): ParsedTransaction[] {
  return parseColumnar(text, {
    dateRe: /\b(\d{2}[-/]\d{2}[-/]\d{4})\b/,
    parseDate: parseDmyFull,
    headerRe: /Debit\s+Credit\s+Balance|Tran\s*Date.*Particulars|Particulars.*Debit/i,
    confidence: 0.85,
  });
}
