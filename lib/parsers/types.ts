// Shared types for parsers, normalization pipeline, and server actions.
// Safe to import from both server and client code (no Node.js-only imports).

export interface ParsedTransaction {
  date: string;          // ISO YYYY-MM-DD
  rawDescription: string;
  amount: number;        // always positive
  type: "DEBIT" | "CREDIT";
  balance?: number;
  currency: string;
  confidence: number;    // 0–1
}

export interface ParserResult {
  success: boolean;
  data: ParsedTransaction[];
  errors: string[];
}

/** Serialisable row passed between server actions and the preview table. */
export interface PreviewRow {
  id: string;
  date: string;           // ISO YYYY-MM-DD
  merchant: string;       // normalised, user-editable
  rawDescription: string; // original text, preserved for DB storage
  amount: number;
  type: "DEBIT" | "CREDIT";
  category: string;       // CategoryName enum value
  isDuplicate?: boolean;
  isFlagged?: boolean;
}
