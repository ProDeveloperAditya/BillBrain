"use client";

import { useRef, useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { ArrowUp, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PromptInputBoxProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PromptInputBox({
  onSend,
  disabled = false,
  placeholder = "Ask about your finances…",
  className,
}: PromptInputBoxProps) {
  const [value, setValue]     = useState("");
  const [files, setFiles]     = useState<File[]>([]);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);
  const fileInputRef          = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    adjustHeight();
  };

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  }, [value, files, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className={cn("w-full", className)}>
      {/* File chips */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5 mb-2 overflow-hidden"
          >
            {files.map((f, i) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary"
              >
                {f.name.length > 20 ? f.name.slice(0, 17) + "…" : f.name}
                <button
                  onClick={() => removeFile(i)}
                  className="hover:text-destructive transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input wrapper */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background/60 backdrop-blur-sm px-3 py-2.5 ring-0 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
        {/* Attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 mb-0.5 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-40"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.csv,.txt"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed max-h-40 min-h-[24px]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ height: "24px" }}
        />

        {/* Send */}
        <motion.button
          type="button"
          onClick={submit}
          disabled={!canSend}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "shrink-0 mb-0.5 flex h-8 w-8 items-center justify-center rounded-xl transition-all",
            canSend
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "bg-muted text-muted-foreground"
          )}
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
