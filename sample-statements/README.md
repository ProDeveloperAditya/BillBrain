# Sample Bank Statements

Format-accurate, **synthetic** bank statement PDFs used to demonstrate and test
BillBrain's multi-bank PDF parser. Every file uses a fake account number
(`XXXXXXXX####`) and a generic holder name — **no real account data**.

| File | Bank | Date format | Columns |
|------|------|-------------|---------|
| `SBI_sample_statement.pdf`   | State Bank of India   | `DD Mon YY`   | Credit · Debit · Balance |
| `HDFC_sample_statement.pdf`  | HDFC Bank             | `DD/MM/YY`    | Withdrawal · Deposit · Balance |
| `ICICI_sample_statement.pdf` | ICICI Bank            | `DD-MM-YYYY`  | Withdrawals · Deposits · Balance |
| `AXIS_sample_statement.pdf`  | Axis Bank             | `DD-MM-YYYY`  | Debit · Credit · Balance |
| `KOTAK_sample_statement.pdf` | Kotak Mahindra Bank   | `DD-MM-YYYY`  | Withdrawal(Dr) · Deposit(Cr) · Balance |

Each statement contains **81 transactions across 3 months (Apr–Jun 2026)** with
recognizable merchants (Zomato, Swiggy, Blinkit, Netflix, IRCTC, Amazon, …) that
exercise the categoriser across 12 categories. Three months of data unlocks the
WLS spend forecast on the dashboard.

## Usage

1. Run the app and open **Import Data**.
2. Upload any file above — the parser auto-detects the bank, extracts every
   transaction, and categorises them.

## Regenerate / verify

```bash
npm run samples:generate   # rebuild all five PDFs
npm run samples:verify     # round-trip each through the real parser stack
```

`samples:verify` reads every PDF back through the exact production pipeline
(`unpdf → detectBank → adapter → categoryTagger`) and asserts the right bank is
detected and 100% of rows parse — a fast integration check for the parser.
