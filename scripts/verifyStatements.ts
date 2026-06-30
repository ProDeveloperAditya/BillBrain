/**
 * Round-trip check: reads each generated PDF through the SAME parsing stack the
 * app uses (unpdf → detectBank → adapter → categoryTagger) and prints a summary.
 *
 *   npx tsx scripts/verifyStatements.ts
 */

import fs from "fs";
import path from "path";
import { extractText, getDocumentProxy } from "unpdf";
import { detectBank } from "../lib/parsers/bankDetector";
import { parseSbi } from "../lib/parsers/sbiAdapter";
import { parseHdfc } from "../lib/parsers/hdfcAdapter";
import { parseIcici } from "../lib/parsers/iciciAdapter";
import { parseAxis } from "../lib/parsers/axisAdapter";
import { parseKotak } from "../lib/parsers/kotakAdapter";
import { tagCategory } from "../lib/normalization/categoryTagger";
import type { ParsedTransaction } from "../lib/parsers/types";

const ADAPTERS: Record<string, (t: string) => ParsedTransaction[]> = {
  SBI: parseSbi, HDFC: parseHdfc, ICICI: parseIcici, AXIS: parseAxis, KOTAK: parseKotak, UNKNOWN: parseSbi,
};

async function verify(file: string) {
  const buf = fs.readFileSync(file);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join(" ") : result.text;

  const bank = detectBank(text);
  const txns = ADAPTERS[bank](text);

  const debits = txns.filter((t) => t.type === "DEBIT").length;
  const credits = txns.filter((t) => t.type === "CREDIT").length;

  const cats: Record<string, number> = {};
  let uncategorised = 0;
  for (const t of txns) {
    const cat = tagCategory(t.rawDescription, t.rawDescription);
    cats[cat] = (cats[cat] ?? 0) + 1;
    if (cat === "OTHER") uncategorised++;
  }

  const catAccuracy = txns.length > 0 ? Math.round(((txns.length - uncategorised) / txns.length) * 100) : 0;

  console.log(`\n── ${path.basename(file)} ──`);
  console.log(`  Detected bank : ${bank}`);
  console.log(`  Transactions  : ${txns.length}  (${debits} debit, ${credits} credit)`);
  console.log(`  Categorised   : ${catAccuracy}%  (${uncategorised} uncategorised)`);
  console.log(`  Categories    : ${Object.entries(cats).map(([k, v]) => `${k}:${v}`).join(", ")}`);
  if (txns.length > 0) {
    const sample = txns[0];
    console.log(`  First txn     : ${sample.date} ${sample.type} ₹${sample.amount} — "${sample.rawDescription}"`);
  }

  return { bank, count: txns.length, catAccuracy };
}

async function main() {
  const dir = path.join(process.cwd(), "sample-statements");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));

  let allGood = true;
  for (const f of files) {
    const r = await verify(path.join(dir, f));
    const expectedBank = f.split("_")[0];
    if (r.bank !== expectedBank || r.count === 0) allGood = false;
  }

  console.log(`\n${allGood ? "✓ ALL STATEMENTS PARSED CORRECTLY" : "✗ SOME STATEMENTS FAILED"}`);
  process.exit(allGood ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
