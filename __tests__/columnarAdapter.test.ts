import { describe, it, expect } from "vitest";
import { parseColumnar, parseDmyFull, parseDmyFlexible } from "../lib/parsers/columnarAdapter";
import { parseIcici } from "../lib/parsers/iciciAdapter";
import { parseAxis } from "../lib/parsers/axisAdapter";
import { parseKotak } from "../lib/parsers/kotakAdapter";
import { parseHdfc } from "../lib/parsers/hdfcAdapter";

// A minimal Axis/ICICI-style body: Date Particulars Debit Credit Balance
const ICICI_BODY = `
ICICI Bank Account Statement
Date Particulars Withdrawals Deposits Balance
05-04-2026 UPI/DR/ZOMATO ORDER/400137 520.00 48230.50
07-04-2026 NEFT/CR/ACME SALARY/400274 92000.00 140230.50
09-04-2026 UPI/DR/BLINKIT GROCERY/400411 840.00 139390.50
`;

describe("parseDmyFull", () => {
  it("parses DD-MM-YYYY", () => expect(parseDmyFull("05-04-2026")).toBe("2026-04-05"));
  it("parses DD/MM/YYYY", () => expect(parseDmyFull("05/04/2026")).toBe("2026-04-05"));
  it("rejects 2-digit year", () => expect(parseDmyFull("05-04-26")).toBeNull());
});

describe("parseDmyFlexible", () => {
  it("parses DD/MM/YY → 20YY", () => expect(parseDmyFlexible("05/04/26")).toBe("2026-04-05"));
  it("parses DD-MM-YYYY", () => expect(parseDmyFlexible("05-04-2026")).toBe("2026-04-05"));
  it("maps year >50 to 19xx", () => expect(parseDmyFlexible("05/04/99")).toBe("1999-04-05"));
});

describe("parseColumnar (ICICI body)", () => {
  const txns = parseIcici(ICICI_BODY);

  it("extracts all three transactions", () => {
    expect(txns).toHaveLength(3);
  });

  it("classifies a withdrawal as DEBIT", () => {
    const zomato = txns.find((t) => /zomato/i.test(t.rawDescription));
    expect(zomato?.type).toBe("DEBIT");
    expect(zomato?.amount).toBe(520);
  });

  it("classifies a salary credit as CREDIT", () => {
    const salary = txns.find((t) => /salary/i.test(t.rawDescription));
    expect(salary?.type).toBe("CREDIT");
    expect(salary?.amount).toBe(92000);
  });

  it("captures the running balance", () => {
    expect(txns[0].balance).toBe(48230.5);
  });

  it("parses dates to ISO", () => {
    expect(txns[0].date).toBe("2026-04-05");
  });
});

describe("credit/debit inference from narration", () => {
  it("treats 'refund' as a credit even with single amount column", () => {
    const body = "Date Particulars Debit Credit Balance\n10-04-2026 UPI/CR/AMAZON REFUND/123 899.00 50000.00";
    const [tx] = parseIcici(body);
    expect(tx.type).toBe("CREDIT");
    expect(tx.amount).toBe(899);
  });

  it("defaults to DEBIT when no credit keyword present", () => {
    const body = "Date Particulars Debit Credit Balance\n10-04-2026 UPI/SWIGGY/123 430.00 49570.00";
    const [tx] = parseIcici(body);
    expect(tx.type).toBe("DEBIT");
  });

  it("ignores a trailing 'Closing Balance:' footer on the last row", () => {
    const body =
      "Date Particulars Debit Credit Balance\n" +
      "10-04-2026 UPI/CR/AMAZON REFUND/123 899.00 50000.00\n" +
      "Closing Balance: INR 50000.00";
    const txns = parseIcici(body);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe("CREDIT");
  });
});

describe("handles 0.00 filler columns (both columns printed)", () => {
  it("picks the debit column when credit is 0.00", () => {
    const body = "Date Particulars Debit Credit Balance\n10-04-2026 POS/FUEL/9 2000.00 0.00 48000.00";
    const [tx] = parseAxis(body);
    expect(tx.type).toBe("DEBIT");
    expect(tx.amount).toBe(2000);
  });

  it("picks the credit column when debit is 0.00", () => {
    const body = "Date Particulars Debit Credit Balance\n10-04-2026 NEFT/SALARY/9 0.00 92000.00 140000.00";
    const [tx] = parseAxis(body);
    expect(tx.type).toBe("CREDIT");
    expect(tx.amount).toBe(92000);
  });
});

describe("HDFC adapter (DD/MM/YY dates via columnar core)", () => {
  const body =
    "Date Narration Withdrawal Amt Deposit Amt Closing Balance\n" +
    "01/04/26 UPI-ZOMATO-000123 520.00 48230.50\n" +
    "03/04/26 NEFT CR-ACME SALARY-000456 92000.00 140230.50";
  const txns = parseHdfc(body);

  it("parses both rows", () => expect(txns).toHaveLength(2));
  it("parses DD/MM/YY date", () => expect(txns[0].date).toBe("2026-04-01"));
  it("detects the salary credit", () => {
    expect(txns.find((t) => /salary/i.test(t.rawDescription))?.type).toBe("CREDIT");
  });
});

describe("Kotak adapter", () => {
  it("parses a Kotak withdrawal row", () => {
    const body = "Date Narration Withdrawal(Dr) Deposit(Cr) Balance\n05-04-2026 UPI/DR/BLINKIT/77 640.00 47590.50";
    const [tx] = parseKotak(body);
    expect(tx.type).toBe("DEBIT");
    expect(tx.amount).toBe(640);
    expect(tx.date).toBe("2026-04-05");
  });
});
