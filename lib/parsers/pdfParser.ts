import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { ParsedTransaction, ParserResult } from "./types";
import { detectBank, type BankName } from "./bankDetector";
import { parseSbi }   from "./sbiAdapter";
import { parseHdfc }  from "./hdfcAdapter";
import { parseIcici } from "./iciciAdapter";
import { parseAxis }  from "./axisAdapter";
import { parseKotak } from "./kotakAdapter";

const ADAPTERS: Record<BankName, (text: string) => ParsedTransaction[]> = {
  SBI:     parseSbi,
  HDFC:    parseHdfc,
  ICICI:   parseIcici,
  AXIS:    parseAxis,
  KOTAK:   parseKotak,
  UNKNOWN: parseSbi, // SBI parser is the most permissive — best generic fallback
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<ParserResult> {
  let text: string;
  try {
    const pdf    = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join(" ") : result.text;
  } catch (e) {
    return { success: false, data: [], errors: [`Couldn't read this PDF: ${String(e)}`] };
  }

  const bank = detectBank(text);

  const transactions = ADAPTERS[bank](text);

  if (transactions.length === 0) {
    return {
      success: false,
      data:    [],
      errors: [
        "No transactions found. This looks like a summary page or a scanned image. " +
        "Upload a statement page with a dated transaction table, or export it as CSV from net banking.",
      ],
    };
  }

  return { success: true, data: transactions, errors: [] };
}
