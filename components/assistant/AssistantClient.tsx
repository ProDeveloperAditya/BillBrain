"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isError?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SUGGESTED = [
  "Why did my spending increase last month?",
  "Which subscriptions should I cancel?",
  "How much am I wasting on food delivery?",
  "Show unusual charges in the last 60 days",
  "What categories grew fastest?",
  "How can I save ₹5,000 this month?",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ── Markdown renderer ──────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      elements.push(<div key={`gap-${i}`} className="h-1.5" />);
      i++;
    } else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="text-muted-foreground font-medium shrink-0 mt-0.5 text-[11px]">
                {j + 1}.
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    } else if (/^[•·]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[•·]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[•·]\s+/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="text-muted-foreground shrink-0 mt-1.5">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-[13px] leading-relaxed">
          {renderInline(line)}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-1">{elements}</div>;
}

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 h-5 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-muted-foreground/35"
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Message bubbles ────────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex justify-end gap-2.5 pl-16"
    >
      <div className="flex flex-col items-end gap-1">
        <div className="rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/25 px-4 py-2.5 text-[13px] text-foreground leading-relaxed">
          {msg.content}
        </div>
        <span className="text-[10px] text-muted-foreground pr-1 tabular-nums">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

function AiBubble({
  msg,
  showTyping,
}: {
  msg: Message;
  showTyping: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex items-start gap-2.5 pr-16"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div
          className={cn(
            "surface-2 border rounded-2xl rounded-tl-sm px-4 py-2.5",
            msg.isError ? "border-destructive/30 bg-destructive/5" : "border-border"
          )}
        >
          {showTyping ? (
            <TypingIndicator />
          ) : (
            <MarkdownContent content={msg.content} />
          )}
        </div>
        {!showTyping && (
          <span className="text-[10px] text-muted-foreground pl-1 tabular-nums">
            {formatTime(msg.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Suggestion pills ───────────────────────────────────────────────────────────

function SuggestionPills({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: 0.2 }}
      className="space-y-2.5 pt-3 pb-1"
    >
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
        Suggested questions
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-[12px] px-3 py-1.5 rounded-full border border-border surface-3 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main client ────────────────────────────────────────────────────────────────

export function AssistantClient({ isDemo }: { isDemo: boolean }) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your BillBrain financial assistant. Ask me anything about your spending — I'll answer based on your actual transaction data.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const placeholder: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setPendingId(placeholder.id);
      setMessages((prev) => [...prev, userMsg, placeholder]);
      setInput("");
      setIsLoading(true);

      try {
        const history = messages
          .filter((m) => m.id !== "welcome" && m.content)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId: sessionId ?? undefined,
            history,
          }),
        });

        if (!res.ok) throw new Error("api-error");

        const data: { text: string; sessionId: string } = await res.json();
        setSessionId(data.sessionId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? { ...m, content: data.text, timestamp: new Date() }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholder.id
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                  timestamp: new Date(),
                  isError: true,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setPendingId(null);
        textareaRef.current?.focus();
      }
    },
    [messages, isLoading, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showPills = messages.length === 1;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Answers grounded in your actual transaction data
        </p>
      </div>

      {/* Demo banner */}
      <AnimatePresence>
        {isDemo && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <p className="text-[12px] text-amber-400/90">
                Demo mode — connect an AI key in{" "}
                <a
                  href="/settings"
                  className="underline underline-offset-2 hover:text-amber-400 transition-colors"
                >
                  Settings
                </a>{" "}
                for live answers
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat pane */}
      <div className="flex-1 min-h-0 flex flex-col surface-2 border border-border rounded-2xl overflow-hidden">
        {/* Message scroll area */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 pt-5 pb-4 space-y-4">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <UserBubble key={msg.id} msg={msg} />
            ) : (
              <AiBubble
                key={msg.id}
                msg={msg}
                showTyping={msg.id === pendingId && isLoading}
              />
            )
          )}

          <AnimatePresence>{showPills && <SuggestionPills onSelect={sendMessage} />}</AnimatePresence>

          <div ref={scrollAnchorRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t border-border px-4 py-3 bg-background/40">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your spending… (Enter to send, Shift+Enter for newline)"
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none max-h-32 min-h-[38px] text-sm py-2 leading-relaxed"
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 h-9 w-9 mb-0.5"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            BillBrain AI provides informational insights only — not professional financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
