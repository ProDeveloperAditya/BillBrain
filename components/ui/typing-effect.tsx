"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TypingEffectProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
}

export default function TypingEffect({
  texts,
  typingSpeed = 60,
  deletingSpeed = 30,
  pauseDuration = 1800,
  className,
}: TypingEffectProps) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex]     = useState(0);
  const [phase, setPhase]             = useState<"typing" | "pause" | "deleting">("typing");

  useEffect(() => {
    const target = texts[textIndex] ?? "";

    if (phase === "typing") {
      if (displayText.length < target.length) {
        const t = setTimeout(() => setDisplayText(target.slice(0, displayText.length + 1)), typingSpeed);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("pause"), pauseDuration);
        return () => clearTimeout(t);
      }
    }

    if (phase === "pause") {
      const t = setTimeout(() => setPhase("deleting"), 100);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (displayText.length > 0) {
        const t = setTimeout(() => setDisplayText(displayText.slice(0, -1)), deletingSpeed);
        return () => clearTimeout(t);
      } else {
        setTextIndex((i) => (i + 1) % texts.length);
        setPhase("typing");
      }
    }
  }, [displayText, phase, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span>{displayText}</span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        className="ml-0.5 inline-block w-[2px] h-[1em] bg-primary rounded-full"
      />
    </span>
  );
}
