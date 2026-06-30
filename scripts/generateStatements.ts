/**
 * Generates format-accurate sample bank statement PDFs for SBI, HDFC, ICICI,
 * Axis and Kotak — one per bank — into ./sample-statements/.
 *
 * These are synthetic fixtures: fake account numbers, a generic holder name,
 * and the realistic-merchant dataset in sampleStatementData.ts. Each PDF mirrors
 * the real column layout of that bank so the corresponding adapter parses it
 * exactly as it would a genuine statement.
 *
 *   npx tsx scripts/generateStatements.ts
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {
  buildSampleTransactions,
  OPENING_BALANCE,
  ACCOUNT_HOLDER,
  type SampleTxn,
} from "./sampleStatementData";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface Row extends SampleTxn {
  balance: number;
  ref: string;
}

function withRunningBalance(txns: SampleTxn[]): Row[] {
  let bal = OPENING_BALANCE;
  return txns.map((t, i) => {
    bal += t.type === "CREDIT" ? t.amount : -t.amount;
    return { ...t, balance: Math.round(bal * 100) / 100, ref: String(400000 + i * 137) };
  });
}

function money(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** DD-MM-YYYY */
function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
/** DD/MM/YY */
function dmyShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
/** DD Mon YY */
function dMonY(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mon = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)];
  return `${d} ${mon} ${y.slice(2)}`;
}

// ─── Bank format definitions ────────────────────────────────────────────────

interface BankFormat {
  file: string;
  bankHeader: string;           // appears top of page 1 for fingerprinting
  ifsc: string;
  accountNo: string;
  /** column header line printed above the table */
  tableHeader: string;
  /** build the narration text for one row */
  narration: (r: Row) => string;
  /** format the leading date cell */
  fmtDate: (iso: string) => string;
}

const COL = { date: 12, desc: 50, amt: 14, bal: 16 };

/** Build a fixed-width row: date | desc | debit | credit | balance. */
function rowLine(dateStr: string, desc: string, r: Row): string {
  const debit  = r.type === "DEBIT"  ? money(r.amount) : "";
  const credit = r.type === "CREDIT" ? money(r.amount) : "";
  return (
    dateStr.padEnd(COL.date) +
    desc.slice(0, COL.desc - 1).padEnd(COL.desc) +
    debit.padStart(COL.amt) +
    credit.padStart(COL.amt) +
    money(r.balance).padStart(COL.bal)
  );
}

/** SBI prints Credit | Debit | Balance (credit column first). */
function sbiRowLine(dateStr: string, desc: string, r: Row): string {
  const credit = r.type === "CREDIT" ? money(r.amount) : "";
  const debit  = r.type === "DEBIT"  ? money(r.amount) : "";
  return (
    dateStr.padEnd(COL.date) +
    desc.slice(0, COL.desc - 1).padEnd(COL.desc) +
    credit.padStart(COL.amt) +
    debit.padStart(COL.amt) +
    money(r.balance).padStart(COL.bal)
  );
}

const FORMATS: BankFormat[] = [
  {
    file: "SBI",
    bankHeader: "STATE BANK OF INDIA",
    ifsc: "SBIN0001234",
    accountNo: "XXXXXXXX4521",
    tableHeader: "Date".padEnd(COL.date) + "Description".padEnd(COL.desc) +
      "Credit".padStart(COL.amt) + "Debit".padStart(COL.amt) + "Balance".padStart(COL.bal),
    fmtDate: dMonY,
    narration: (r) => {
      const dir = r.type === "DEBIT" ? "DR" : "CR";
      const vpa = r.merchant.split(" ")[0].toLowerCase() + "@okhdfcbank";
      return `${r.mode}/${dir}/${r.ref}/${r.merchant}/SBIN/${vpa}`;
    },
  },
  {
    file: "HDFC",
    bankHeader: "HDFC BANK LTD",
    ifsc: "HDFC0000123",
    accountNo: "XXXXXXXX7788",
    tableHeader: "Date".padEnd(COL.date) + "Narration".padEnd(COL.desc) +
      "Withdrawal Amt".padStart(COL.amt) + "Deposit Amt".padStart(COL.amt) + "Closing Balance".padStart(COL.bal),
    fmtDate: dmyShort,
    narration: (r) => {
      const dir = r.type === "CREDIT" ? "CR" : "";
      return `${r.mode}${dir ? " " + dir : ""}-${r.merchant}-${r.ref}`;
    },
  },
  {
    file: "ICICI",
    bankHeader: "ICICI BANK LIMITED",
    ifsc: "ICIC0000456",
    accountNo: "XXXXXXXX3091",
    tableHeader: "Date".padEnd(COL.date) + "Particulars".padEnd(COL.desc) +
      "Withdrawals".padStart(COL.amt) + "Deposits".padStart(COL.amt) + "Balance".padStart(COL.bal),
    fmtDate: dmy,
    narration: (r) => {
      const dir = r.type === "CREDIT" ? "CR" : "DR";
      return `${r.mode}/${dir}/${r.merchant}/${r.ref}`;
    },
  },
  {
    file: "AXIS",
    bankHeader: "AXIS BANK LTD",
    ifsc: "UTIB0000789",
    accountNo: "XXXXXXXX6620",
    tableHeader: "Tran Date".padEnd(COL.date) + "Particulars".padEnd(COL.desc) +
      "Debit".padStart(COL.amt) + "Credit".padStart(COL.amt) + "Balance".padStart(COL.bal),
    fmtDate: dmy,
    narration: (r) => {
      const tag = r.type === "CREDIT" ? "CR" : "P2M";
      return `${r.mode}/${tag}/${r.merchant}/${r.ref}`;
    },
  },
  {
    file: "KOTAK",
    bankHeader: "KOTAK MAHINDRA BANK",
    ifsc: "KKBK0000321",
    accountNo: "XXXXXXXX5544",
    tableHeader: "Date".padEnd(COL.date) + "Narration".padEnd(COL.desc) +
      "Withdrawal(Dr)".padStart(COL.amt) + "Deposit(Cr)".padStart(COL.amt) + "Balance".padStart(COL.bal),
    fmtDate: dmy,
    narration: (r) => {
      const dir = r.type === "CREDIT" ? "CR" : "DR";
      return `${r.mode}/${dir}/${r.merchant}/${r.ref}`;
    },
  },
];

// ─── PDF rendering ──────────────────────────────────────────────────────────

function renderStatement(fmt: BankFormat, rows: Row[], outDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const outPath = path.join(outDir, `${fmt.file}_sample_statement.pdf`);
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    // ── Header block (page 1) ──
    doc.font("Helvetica-Bold").fontSize(15).text(fmt.bankHeader, { align: "left" });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#333");
    doc.text("Account Statement (Sample / Demo Data — Not a real account)");
    doc.moveDown(0.5);
    doc.text(`Account Holder : ${ACCOUNT_HOLDER}`);
    doc.text(`Account Number : ${fmt.accountNo}`);
    doc.text(`IFSC Code      : ${fmt.ifsc}`);
    doc.text(`Statement Period: 01-04-2026 to 30-06-2026`);
    doc.text(`Opening Balance : INR ${money(OPENING_BALANCE)}`);
    doc.moveDown(0.8);

    // ── Table header ──
    doc.font("Courier-Bold").fontSize(8).fillColor("#000");
    doc.text(fmt.tableHeader);
    doc.font("Courier").fontSize(8);
    doc.text("".padEnd(104, "-"));

    // ── Rows ──
    const isSbi = fmt.file === "SBI";
    for (const r of rows) {
      const dateStr = fmt.fmtDate(r.date);
      const desc = fmt.narration(r);
      const line = isSbi ? sbiRowLine(dateStr, desc, r) : rowLine(dateStr, desc, r);
      doc.text(line, { lineGap: 1 });
    }

    doc.moveDown(1);
    doc.font("Helvetica").fontSize(8).fillColor("#666");
    doc.text(`Closing Balance: INR ${money(rows[rows.length - 1].balance)}`);
    doc.text("This is a computer-generated sample statement for application testing.");

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const outDir = path.join(process.cwd(), "sample-statements");
  fs.mkdirSync(outDir, { recursive: true });

  const txns = buildSampleTransactions();
  const rows = withRunningBalance(txns);

  for (const fmt of FORMATS) {
    await renderStatement(fmt, rows, outDir);
    console.log(`✓ ${fmt.file.padEnd(6)} → sample-statements/${fmt.file}_sample_statement.pdf  (${rows.length} txns)`);
  }
  console.log(`\nDone. ${FORMATS.length} statements generated in ./sample-statements/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
