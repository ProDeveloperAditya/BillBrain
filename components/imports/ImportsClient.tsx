"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  File,
  MessageSquare,
  Mail,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  parseCsvAction,
  parsePdfAction,
  parseSmsAction,
  parseEmailAction,
} from "@/app/actions/imports";
import type { PreviewRow } from "@/lib/parsers/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type UploadStatus = "idle" | "pending" | "parsing" | "done" | "failed";

type CategoryName =
  | "FOOD_DINING"
  | "GROCERIES"
  | "SUBSCRIPTIONS"
  | "TRANSPORT"
  | "SHOPPING"
  | "RENT_HOUSING"
  | "UTILITIES"
  | "COFFEE_CAFES"
  | "SALARY_INCOME"
  | "HEALTHCARE"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "TRAVEL"
  | "INSURANCE"
  | "BANKING_FEES"
  | "TRANSFERS"
  | "INVESTMENTS"
  | "OTHER";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: CategoryName; label: string; color: string }[] = [
  { value: "FOOD_DINING",   label: "Food & Dining",    color: "#f97316" },
  { value: "GROCERIES",     label: "Groceries",         color: "#84cc16" },
  { value: "SUBSCRIPTIONS", label: "Subscriptions",    color: "#8b5cf6" },
  { value: "TRANSPORT",     label: "Transport",         color: "#06b6d4" },
  { value: "SHOPPING",      label: "Shopping",          color: "#f59e0b" },
  { value: "RENT_HOUSING",  label: "Rent & Housing",    color: "#ef4444" },
  { value: "UTILITIES",     label: "Utilities",         color: "#64748b" },
  { value: "COFFEE_CAFES",  label: "Coffee & Cafés",    color: "#d97706" },
  { value: "SALARY_INCOME", label: "Salary & Income",   color: "#22c55e" },
  { value: "HEALTHCARE",    label: "Healthcare",         color: "#ec4899" },
  { value: "EDUCATION",     label: "Education",          color: "#0ea5e9" },
  { value: "ENTERTAINMENT", label: "Entertainment",      color: "#a855f7" },
  { value: "TRAVEL",        label: "Travel",             color: "#14b8a6" },
  { value: "INSURANCE",     label: "Insurance",          color: "#78716c" },
  { value: "BANKING_FEES",  label: "Banking Fees",       color: "#6b7280" },
  { value: "TRANSFERS",     label: "Transfers",          color: "#9ca3af" },
  { value: "INVESTMENTS",   label: "Investments",        color: "#10b981" },
  { value: "OTHER",         label: "Other",              color: "#94a3b8" },
];

const CAT_META = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, { label: c.label, color: c.color }])
);

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UploadStatus }) {
  const conf = {
    idle:    { label: "Ready",   icon: null,         cls: "text-muted-foreground border-border/50" },
    pending: { label: "Pending", icon: null,         cls: "text-amber-400 border-amber-400/30 bg-amber-400/8" },
    parsing: { label: "Parsing", icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />, cls: "text-blue-400 border-blue-400/30 bg-blue-400/8" },
    done:    { label: "Done",    icon: <CheckCircle2 className="h-2.5 w-2.5" />, cls: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8" },
    failed:  { label: "Failed",  icon: <AlertCircle className="h-2.5 w-2.5" />,  cls: "text-destructive border-destructive/30 bg-destructive/8" },
  }[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        conf.cls
      )}
    >
      {conf.icon}
      {conf.label}
    </span>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 w-full rounded-full bg-border overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── File drop zone ────────────────────────────────────────────────────────────

interface DropZoneProps {
  accept: Record<string, string[]>;
  label: string;
  hint: string;
  icon: React.ElementType;
  color: string;
  onFile: (file: File) => void;
  file: File | null;
  status: UploadStatus;
  progress: number;
  onClear: () => void;
}

function DropZone({
  accept,
  label,
  hint,
  icon: Icon,
  color,
  onFile,
  file,
  status,
  progress,
  onClear,
}: DropZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) onFile(accepted[0]); },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  });

  const hasFile = !!file;

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none",
          hasFile ? "border-primary/40 bg-primary/4 py-5" : "py-12",
          isDragActive && !isDragReject ? "border-primary bg-primary/8 scale-[1.01]" : !hasFile ? "border-border/50 hover:border-primary/50 hover:bg-surface-3/30" : "",
          isDragReject && "border-destructive/60 bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {hasFile ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-3 w-full px-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}18` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                {(status === "parsing" || status === "pending") && (
                  <div className="mt-2"><ProgressBar progress={progress} /></div>
                )}
              </div>
              <StatusBadge status={status} />
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", isDragActive ? "bg-primary/20" : "bg-surface-3")}>
                {isDragActive ? <Upload className="h-6 w-6 text-primary" /> : <Icon className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{isDragActive ? "Drop to upload" : label}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{hint}</p>
              </div>
              {isDragReject && <p className="text-xs text-destructive">File type not supported</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Editable preview row ──────────────────────────────────────────────────────

interface EditableRowProps {
  row: PreviewRow;
  index: number;
  onChange: (id: string, field: keyof PreviewRow, value: string) => void;
}

function EditableRow({ row, index, onChange }: EditableRowProps) {
  const [editingMerchant, setEditingMerchant] = useState(false);
  const catMeta = CAT_META[row.category] ?? CAT_META.OTHER;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group border-b border-border/50 last:border-0 hover:bg-surface-3/30 transition-colors",
        row.isDuplicate && "bg-destructive/4",
        row.isFlagged && !row.isDuplicate && "bg-amber-400/4"
      )}
    >
      <td className="py-2.5 pl-4 pr-3 text-[12px] text-muted-foreground whitespace-nowrap">
        {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
      </td>
      <td className="py-2 pr-3">
        {editingMerchant ? (
          <Input
            autoFocus
            value={row.merchant}
            onChange={(e) => onChange(row.id, "merchant", e.target.value)}
            onBlur={() => setEditingMerchant(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingMerchant(false)}
            className="h-7 text-xs w-36"
          />
        ) : (
          <button onClick={() => setEditingMerchant(true)} className="group/edit flex items-center gap-1.5 text-left">
            <span className="text-[13px] font-medium text-foreground">{row.merchant}</span>
            <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity" />
          </button>
        )}
      </td>
      <td className="py-2.5 pr-3 text-right">
        <span className={cn("inline-flex items-center gap-1 text-[13px] font-semibold tabular-nums", row.type === "CREDIT" ? "text-emerald-400" : "text-foreground")}>
          {row.type === "CREDIT" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3 text-muted-foreground" />}
          ₹{row.amount.toLocaleString("en-IN")}
        </span>
      </td>
      <td className="py-2 pr-3">
        <Select value={row.category} onValueChange={(v) => v != null && onChange(row.id, "category", v)}>
          <SelectTrigger
            size="sm"
            className="h-6 text-[11px] px-2 gap-1 border-0 bg-transparent hover:bg-surface-3 transition-colors"
            style={{ color: catMeta.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: catMeta.color }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cat.color }} />
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2.5 pr-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {row.isDuplicate && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/12 text-destructive">Duplicate</span>
          )}
          {row.isFlagged && !row.isDuplicate && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-400/12 text-amber-400">Review</span>
          )}
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", row.type === "CREDIT" ? "bg-emerald-400/12 text-emerald-400" : "bg-surface-3 text-muted-foreground")}>
            {row.type === "CREDIT" ? "Credit" : "Debit"}
          </span>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({
  rows,
  onRowChange,
  onConfirm,
  onCancel,
  status,
  confirmResult,
}: {
  rows: PreviewRow[];
  onRowChange: (id: string, field: keyof PreviewRow, value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  status: UploadStatus;
  confirmResult?: { saved: number; skipped: number } | null;
}) {
  const flagged   = rows.filter((r) => r.isFlagged && !r.isDuplicate).length;
  const dupes     = rows.filter((r) => r.isDuplicate).length;
  const total     = rows.filter((r) => r.type === "DEBIT").reduce((s, r) => s + r.amount, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="surface-2 border-border mt-4">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Preview
                  <StatusBadge status={status} />
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {rows.length} transactions · ₹{total.toLocaleString("en-IN")} total debit
                  {dupes   > 0 && <span className="ml-2 text-destructive">· {dupes} duplicate{dupes > 1 ? "s" : ""} will be skipped</span>}
                  {flagged > 0 && <span className="ml-2 text-amber-400">· {flagged} flagged for review</span>}
                </p>
              </div>
              {confirmResult && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  {confirmResult.saved} saved{confirmResult.skipped > 0 ? `, ${confirmResult.skipped} skipped` : ""}
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border/50">
                  {["Date", "Merchant", "Amount", "Category", "Type"].map((h) => (
                    <th key={h} className={cn("py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", h === "Amount" || h === "Type" ? "text-right" : "text-left", h === "Date" ? "pl-4 pr-3" : h === "Type" ? "pr-4" : "pr-3")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <EditableRow key={row.id} row={row} index={i} onChange={onRowChange} />
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-surface-1/60 rounded-b-xl">
            <p className="text-[11px] text-muted-foreground">
              {status === "done"
                ? "Import complete. Duplicates were automatically skipped."
                : "Review and edit any rows, then confirm to save."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCancel} className="h-8">
                {status === "done" ? "Close" : "Cancel"}
              </Button>
              {status !== "done" && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={status === "parsing" || rows.filter((r) => !r.isDuplicate).length === 0}
                  className="h-8 gap-1.5"
                >
                  {status === "parsing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Confirm Import ({rows.filter((r) => !r.isDuplicate).length})
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── SMS / Email paste pane ────────────────────────────────────────────────────

interface PastePaneProps {
  placeholder: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  status: UploadStatus;
  onParse: () => void;
  onClear: () => void;
  accentColor: string;
}

function PastePane({ placeholder, hint, value, onChange, status, onParse, onClear, accentColor }: PastePaneProps) {
  const hasContent = value.trim().length > 0;
  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[180px] font-mono text-[12px] resize-y"
        />
        {hasContent && (
          <button onClick={onClear} className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors" aria-label="Clear">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        <div className="flex items-center gap-2">
          {hasContent && <StatusBadge status={status} />}
          <Button
            size="sm"
            disabled={!hasContent || status === "parsing"}
            onClick={onParse}
            className="h-8 gap-1.5"
            style={hasContent ? { backgroundColor: accentColor, color: "#fff" } : undefined}
          >
            {status === "parsing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            Parse Text
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/6 px-3 py-2.5 mt-3">
      <p className="text-[11px] font-semibold text-destructive mb-1">
        {errors.length} issue{errors.length > 1 ? "s" : ""} found
      </p>
      <ul className="space-y-0.5">
        {errors.slice(0, 5).map((e, i) => (
          <li key={i} className="text-[11px] text-muted-foreground">{e}</li>
        ))}
        {errors.length > 5 && (
          <li className="text-[11px] text-muted-foreground">…and {errors.length - 5} more</li>
        )}
      </ul>
    </div>
  );
}

// ─── Format hints ──────────────────────────────────────────────────────────────

function FormatHints({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-border/50 bg-surface-1/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Expected format</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check className="h-2.5 w-2.5 shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ImportsClient() {
  const router = useRouter();

  const [csvFile,    setCsvFile]    = useState<File | null>(null);
  const [pdfFile,    setPdfFile]    = useState<File | null>(null);
  const [csvStatus,  setCsvStatus]  = useState<UploadStatus>("idle");
  const [pdfStatus,  setPdfStatus]  = useState<UploadStatus>("idle");
  const [csvProgress,setCsvProgress]= useState(0);
  const [pdfProgress,setPdfProgress]= useState(0);
  const [csvErrors,  setCsvErrors]  = useState<string[]>([]);
  const [pdfErrors,  setPdfErrors]  = useState<string[]>([]);

  const [smsText,     setSmsText]    = useState("");
  const [emailText,   setEmailText]  = useState("");
  const [smsStatus,   setSmsStatus]  = useState<UploadStatus>("idle");
  const [emailStatus, setEmailStatus]= useState<UploadStatus>("idle");
  const [smsErrors,   setSmsErrors]  = useState<string[]>([]);
  const [emailErrors, setEmailErrors]= useState<string[]>([]);

  const [previewRows,   setPreviewRows]   = useState<PreviewRow[]>([]);
  const [previewStatus, setPreviewStatus] = useState<UploadStatus>("idle");
  const [showPreview,   setShowPreview]   = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ saved: number; skipped: number } | null>(null);
  const [activeSource,  setActiveSource]  = useState<{ method: "CSV"|"PDF"|"SMS_TEXT"|"EMAIL_TEXT"; filename: string; size: number } | null>(null);

  // ── CSV handler ──────────────────────────────────────────────────────────
  async function handleCsvFile(f: File) {
    setCsvFile(f);
    setCsvStatus("parsing");
    setCsvProgress(20);
    setCsvErrors([]);
    setShowPreview(false);
    setConfirmResult(null);
    setActiveSource({ method: "CSV", filename: f.name, size: f.size });
    try {
      const text = await f.text();
      setCsvProgress(60);
      const result = await parseCsvAction(text);
      setCsvProgress(100);
      if (result.success) {
        setCsvStatus("done");
        setCsvErrors(result.errors);
        setPreviewRows(result.data);
        setPreviewStatus("idle");
        setShowPreview(true);
      } else {
        setCsvStatus("failed");
        setCsvErrors(result.errors);
      }
    } catch (e) {
      setCsvStatus("failed");
      setCsvErrors([`Unexpected error: ${String(e)}`]);
    }
  }

  // ── PDF handler ──────────────────────────────────────────────────────────
  async function handlePdfFile(f: File) {
    setPdfFile(f);
    setPdfStatus("parsing");
    setPdfProgress(15);
    setPdfErrors([]);
    setShowPreview(false);
    setConfirmResult(null);
    setActiveSource({ method: "PDF", filename: f.name, size: f.size });
    try {
      const base64 = await fileToBase64(f);
      setPdfProgress(50);
      const result = await parsePdfAction(base64);
      setPdfProgress(100);
      if (result.success) {
        setPdfStatus("done");
        setPdfErrors(result.errors);
        setPreviewRows(result.data);
        setPreviewStatus("idle");
        setShowPreview(true);
      } else {
        setPdfStatus("failed");
        setPdfErrors(result.errors);
      }
    } catch (e) {
      setPdfStatus("failed");
      setPdfErrors([`Unexpected error: ${String(e)}`]);
    }
  }

  // ── SMS handler ───────────────────────────────────────────────────────────
  async function handleSmsParse() {
    setSmsStatus("parsing");
    setSmsErrors([]);
    setShowPreview(false);
    setConfirmResult(null);
    setActiveSource({ method: "SMS_TEXT", filename: "sms-paste.txt", size: smsText.length });
    try {
      const result = await parseSmsAction(smsText);
      if (result.success) {
        setSmsStatus("done");
        setSmsErrors(result.errors);
        setPreviewRows(result.data);
        setPreviewStatus("idle");
        setShowPreview(true);
      } else {
        setSmsStatus("failed");
        setSmsErrors(result.errors);
      }
    } catch (e) {
      setSmsStatus("failed");
      setSmsErrors([`Unexpected error: ${String(e)}`]);
    }
  }

  // ── Email handler ─────────────────────────────────────────────────────────
  async function handleEmailParse() {
    setEmailStatus("parsing");
    setEmailErrors([]);
    setShowPreview(false);
    setConfirmResult(null);
    setActiveSource({ method: "EMAIL_TEXT", filename: "email-paste.txt", size: emailText.length });
    try {
      const result = await parseEmailAction(emailText);
      if (result.success) {
        setEmailStatus("done");
        setEmailErrors(result.errors);
        setPreviewRows(result.data);
        setPreviewStatus("idle");
        setShowPreview(true);
      } else {
        setEmailStatus("failed");
        setEmailErrors(result.errors);
      }
    } catch (e) {
      setEmailStatus("failed");
      setEmailErrors([`Unexpected error: ${String(e)}`]);
    }
  }

  // ── Row editing ───────────────────────────────────────────────────────────
  function handleRowChange(id: string, field: keyof PreviewRow, value: string) {
    setPreviewRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!activeSource) return;
    setPreviewStatus("parsing");
    try {
      const res = await fetch("/api/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows:        previewRows,
          parseMethod: activeSource.method,
          filename:    activeSource.filename,
          fileSize:    activeSource.size,
        }),
      });

      const data = await res.json() as { imported: number; skipped: number; errors: string[] };

      if (res.ok) {
        setPreviewStatus("done");
        setConfirmResult({ saved: data.imported, skipped: data.skipped });
        // Trigger Next.js to re-fetch server components (dashboard, transactions)
        router.refresh();
      } else {
        setPreviewStatus("failed");
      }
    } catch (e) {
      setPreviewStatus("failed");
      console.error(e);
    }
  }

  // ── Cancel / reset ────────────────────────────────────────────────────────
  function handleCancel() {
    setShowPreview(false);
    setPreviewRows([]);
    setPreviewStatus("idle");
    setConfirmResult(null);
    setActiveSource(null);
    setCsvFile(null);  setCsvStatus("idle");  setCsvProgress(0);  setCsvErrors([]);
    setPdfFile(null);  setPdfStatus("idle");  setPdfProgress(0);  setPdfErrors([]);
    setSmsText("");    setSmsStatus("idle");   setSmsErrors([]);
    setEmailText("");  setEmailStatus("idle"); setEmailErrors([]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload bank statements or paste transaction text to extract insights
        </p>
      </div>

      <Card className="surface-2 border-border">
        <CardContent className="pt-4 pb-5">
          <Tabs defaultValue="csv">
            <TabsList className="w-full sm:w-auto mb-5">
              <TabsTrigger value="csv"   className="gap-1.5 text-xs px-3"><FileText    className="h-3.5 w-3.5" />CSV</TabsTrigger>
              <TabsTrigger value="pdf"   className="gap-1.5 text-xs px-3"><File        className="h-3.5 w-3.5" />PDF</TabsTrigger>
              <TabsTrigger value="sms"   className="gap-1.5 text-xs px-3"><MessageSquare className="h-3.5 w-3.5" />SMS</TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5 text-xs px-3"><Mail        className="h-3.5 w-3.5" />Email</TabsTrigger>
            </TabsList>

            {/* ── CSV ──────────────────────────────────────────────────────── */}
            <TabsContent value="csv">
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Upload CSV / Excel</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Export transaction history from your bank, Paytm, PhonePe, CRED, or any wallet app
                  </p>
                </div>
                <DropZone
                  accept={{ "text/csv": [".csv"], "application/vnd.ms-excel": [".xls", ".xlsx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
                  label="Drag & drop your CSV file, or click to browse"
                  hint="Supports .csv · .xls · .xlsx — Max 10 MB"
                  icon={FileText}
                  color="#10b981"
                  onFile={handleCsvFile}
                  file={csvFile}
                  status={csvStatus}
                  progress={csvProgress}
                  onClear={() => { setCsvFile(null); setCsvStatus("idle"); setCsvProgress(0); setCsvErrors([]); }}
                />
                <ErrorBanner errors={csvErrors} />
                <FormatHints items={["Date column (any format)", "Amount or Debit/Credit columns", "Merchant / Description column", "Optional: Balance, Transaction ID"]} />
              </div>
            </TabsContent>

            {/* ── PDF ──────────────────────────────────────────────────────── */}
            <TabsContent value="pdf">
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Upload PDF Statement</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Monthly bank or credit card statements — HDFC, ICICI, SBI, Axis, Kotak and more
                  </p>
                </div>
                <DropZone
                  accept={{ "application/pdf": [".pdf"] }}
                  label="Drag & drop your bank statement PDF, or click to browse"
                  hint="Supports .pdf · Text-based PDFs only · Max 20 MB"
                  icon={File}
                  color="#8b5cf6"
                  onFile={handlePdfFile}
                  file={pdfFile}
                  status={pdfStatus}
                  progress={pdfProgress}
                  onClear={() => { setPdfFile(null); setPdfStatus("idle"); setPdfProgress(0); setPdfErrors([]); }}
                />
                <ErrorBanner errors={pdfErrors} />
                <FormatHints items={["Text-layer PDFs (not scanned images)", "Standard bank statement format", "Multi-page statements supported", "Password-protected PDFs not supported"]} />
              </div>
            </TabsContent>

            {/* ── SMS ──────────────────────────────────────────────────────── */}
            <TabsContent value="sms">
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Paste SMS Transactions</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Copy your bank / UPI / wallet transaction SMSes and paste them here
                  </p>
                </div>
                <PastePane
                  placeholder={`Paste your SMS transactions here…\n\nExample:\nYour A/c XX1234 debited Rs.345.00 on 20-Apr-26. Info: UPI/ZOMATO/ORDER. Avl Bal: Rs.54,321.00\n\nYour A/c XX1234 credited Rs.75,000.00 on 01-Apr-26. Info: NEFT/SALARY. Avl Bal: Rs.1,29,321.00`}
                  hint="Paste one or more SMS messages — each will be parsed individually"
                  value={smsText}
                  onChange={setSmsText}
                  status={smsStatus}
                  onParse={handleSmsParse}
                  onClear={() => { setSmsText(""); setSmsStatus("idle"); setSmsErrors([]); }}
                  accentColor="#f59e0b"
                />
                <ErrorBanner errors={smsErrors} />
              </div>
            </TabsContent>

            {/* ── Email ────────────────────────────────────────────────────── */}
            <TabsContent value="email">
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">Paste Billing Emails</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Copy subscription invoices or billing confirmation emails and paste the text here
                  </p>
                </div>
                <PastePane
                  placeholder={`Paste your billing email text here…\n\nExample:\nYour Netflix subscription has been renewed.\nPlan: Premium · ₹649.00 charged to Visa ending 1234\nDate: April 7, 2026\nNext billing: May 7, 2026`}
                  hint="Works best with plain text — remove images and signatures before pasting"
                  value={emailText}
                  onChange={setEmailText}
                  status={emailStatus}
                  onParse={handleEmailParse}
                  onClear={() => { setEmailText(""); setEmailStatus("idle"); setEmailErrors([]); }}
                  accentColor="#8b5cf6"
                />
                <ErrorBanner errors={emailErrors} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showPreview && previewRows.length > 0 && (
        <PreviewTable
          rows={previewRows}
          onRowChange={handleRowChange}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          status={previewStatus}
          confirmResult={confirmResult}
        />
      )}
    </div>
  );
}
