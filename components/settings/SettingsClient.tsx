"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  User, Key, Database, Download, AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  updateProfileAction, updateAiProviderAction, resetAllDataAction,
} from "@/app/actions/settings";
import type { Currency, SpendingGoal, AIProvider } from "@prisma/client";

// ── Option tables ─────────────────────────────────────────────────────────────

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "INR", label: "₹ INR — Indian Rupee" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "AUD", label: "A$ AUD — Australian Dollar" },
  { value: "CAD", label: "C$ CAD — Canadian Dollar" },
  { value: "SGD", label: "S$ SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
];

const GOALS: { value: SpendingGoal; label: string }[] = [
  { value: "SAVE_MORE",             label: "Save more money" },
  { value: "CUT_SUBSCRIPTIONS",     label: "Cut subscriptions" },
  { value: "UNDERSTAND_PATTERNS",   label: "Understand spending patterns" },
  { value: "REDUCE_LEAKS",          label: "Reduce money leaks" },
  { value: "BUILD_EMERGENCY_FUND",  label: "Build an emergency fund" },
];

const PROVIDERS: { value: AIProvider; label: string; desc: string }[] = [
  { value: "DEMO",   label: "Demo (mock responses)",  desc: "No API key required — ideal for testing" },
  { value: "OPENAI", label: "OpenAI (GPT-4o)",        desc: "Requires OPENAI_API_KEY environment variable" },
  { value: "GROQ",   label: "Groq (Llama 3.3 70B)",  desc: "Requires GROQ_API_KEY environment variable" },
];

// ── Small atoms ───────────────────────────────────────────────────────────────

function StatusMsg({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-[11px] font-medium flex items-center gap-1 ${ok ? "text-emerald-400" : "text-destructive"}`}
    >
      {ok
        ? <CheckCircle2 className="h-3 w-3 shrink-0" />
        : <AlertCircle className="h-3 w-3 shrink-0" />}
      {msg}
    </motion.span>
  );
}

function SettingCard({
  title, icon: Icon, children, delay = 0,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="surface-2 border-border">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-5 px-5">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface SettingsClientProps {
  name: string;
  email: string;
  currency: Currency;
  spendingGoal: SpendingGoal | null;
  aiProvider: AIProvider;
}

export function SettingsClient({
  name, email, currency, spendingGoal, aiProvider,
}: SettingsClientProps) {
  // ── Profile state ──────────────────────────────────────────────────────────
  const [nameVal, setNameVal] = useState(name);
  const [profileStatus, setProfileStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [profilePending, startProfile] = useTransition();

  // ── Preferences state ──────────────────────────────────────────────────────
  const [currencyVal, setCurrencyVal] = useState<Currency>(currency);
  const [goalVal, setGoalVal] = useState<SpendingGoal | "NONE">(spendingGoal ?? "NONE");
  const [prefStatus, setPrefStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [prefPending, startPref] = useTransition();

  // ── AI provider state ──────────────────────────────────────────────────────
  const [providerVal, setProviderVal] = useState<AIProvider>(aiProvider);
  const [providerStatus, setProviderStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [providerPending, startProvider] = useTransition();

  // ── Reset state ────────────────────────────────────────────────────────────
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [resetPending, startReset] = useTransition();

  // ── Handlers ───────────────────────────────────────────────────────────────

  function saveProfile() {
    setProfileStatus(null);
    startProfile(async () => {
      const res = await updateProfileAction({ name: nameVal });
      setProfileStatus(res.success
        ? { msg: "Saved", ok: true }
        : { msg: (res as { success: false; error: string }).error, ok: false });
    });
  }

  function savePreferences() {
    setPrefStatus(null);
    startPref(async () => {
      const res = await updateProfileAction({
        currency: currencyVal,
        spendingGoal: goalVal === "NONE" ? null : goalVal,
      });
      setPrefStatus(res.success
        ? { msg: "Saved", ok: true }
        : { msg: (res as { success: false; error: string }).error, ok: false });
    });
  }

  function saveProvider() {
    setProviderStatus(null);
    startProvider(async () => {
      const res = await updateAiProviderAction(providerVal);
      setProviderStatus(res.success
        ? { msg: "Saved", ok: true }
        : { msg: (res as { success: false; error: string }).error, ok: false });
    });
  }

  function handleReset() {
    setResetStatus(null);
    startReset(async () => {
      const res = await resetAllDataAction();
      if (res.success) {
        setResetOpen(false);
        setResetStatus({ msg: "All data deleted", ok: true });
      } else {
        setResetStatus({ msg: (res as { success: false; error: string }).error, ok: false });
      }
    });
  }

  const providerDesc = PROVIDERS.find((p) => p.value === providerVal)?.desc ?? "";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your profile, preferences, and AI configuration
        </p>
      </motion.div>

      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      <SettingCard title="Profile" icon={User} delay={0.04}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[12px]">Full name</Label>
            <Input
              id="name"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="Your name"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[12px]">Email</Label>
            <Input
              id="email"
              value={email}
              readOnly
              disabled
              className="h-9 opacity-60"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" className="h-8" onClick={saveProfile} disabled={profilePending}>
            {profilePending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save profile
          </Button>
          {profileStatus && <StatusMsg {...profileStatus} />}
        </div>
      </SettingCard>

      {/* ── Preferences ─────────────────────────────────────────────────────── */}
      <SettingCard title="Preferences" icon={Database} delay={0.08}>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Currency</Label>
          <Select value={currencyVal} onValueChange={(v) => setCurrencyVal(v as Currency)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Spending goal</Label>
          <Select value={goalVal} onValueChange={(v) => setGoalVal(v as SpendingGoal | "NONE")}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No goal set</SelectItem>
              {GOALS.map((g) => (
                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" className="h-8" onClick={savePreferences} disabled={prefPending}>
            {prefPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save preferences
          </Button>
          {prefStatus && <StatusMsg {...prefStatus} />}
        </div>
      </SettingCard>

      {/* ── AI Provider ─────────────────────────────────────────────────────── */}
      <SettingCard title="AI Provider" icon={Key} delay={0.12}>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Active provider</Label>
          <Select value={providerVal} onValueChange={(v) => setProviderVal(v as AIProvider)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{providerDesc}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
          API keys are read from server environment variables (
          <code className="font-mono text-[10px] text-foreground">OPENAI_API_KEY</code>,{" "}
          <code className="font-mono text-[10px] text-foreground">GROQ_API_KEY</code>).
          Keys are never stored in the database.
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" className="h-8" onClick={saveProvider} disabled={providerPending}>
            {providerPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save provider
          </Button>
          {providerStatus && <StatusMsg {...providerStatus} />}
        </div>
      </SettingCard>

      <Separator />

      {/* ── Data management ──────────────────────────────────────────────────── */}
      <SettingCard title="Data management" icon={Database} delay={0.16}>
        <a href="/api/export/transactions" download className="block">
          <Button variant="outline" size="sm" className="w-full justify-start h-9">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export transactions as CSV
          </Button>
        </a>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start h-9 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setResetOpen(true)}
          >
            <AlertCircle className="mr-2 h-3.5 w-3.5" />
            Reset all data
          </Button>
          {resetStatus && <StatusMsg {...resetStatus} />}
          <p className="text-[11px] text-muted-foreground">
            Permanently deletes all uploaded files, transactions, insights, and AI history.
          </p>
        </div>
      </SettingCard>

      {/* Disclaimer */}
      <Card className="surface-2 border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-4 px-5 flex gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Disclaimer:</strong> BillBrain AI provides
            informational financial insights only. This is not professional financial, tax, or
            investment advice. Always consult a qualified financial advisor for major decisions.
          </p>
        </CardContent>
      </Card>

      {/* ── Confirm reset dialog ─────────────────────────────────────────────── */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This permanently deletes all your transactions, uploads, AI chat history, and
              insights. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(false)}
              disabled={resetPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleReset}
              disabled={resetPending}
            >
              {resetPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
