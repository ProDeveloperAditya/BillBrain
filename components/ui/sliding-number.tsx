"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

function Digit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-flex overflow-hidden" style={{ height: "1.15em" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%",   opacity: 1 }}
          exit={{    y: "-110%", opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="block leading-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export interface SlidingNumberProps {
  value: number;
  decimalPlaces?: number;
  locale?: string;
}

export function SlidingNumber({
  value,
  decimalPlaces = 0,
  locale = "en-IN",
}: SlidingNumberProps) {
  const formatted = useMemo(
    () =>
      Math.round(value).toLocaleString(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }),
    [value, decimalPlaces, locale]
  );

  return (
    <span className="inline-flex items-end tabular-nums">
      {formatted.split("").map((char, i) => {
        if (/[,.]/.test(char)) {
          return (
            <span key={`sep-${i}`} className="leading-none">
              {char}
            </span>
          );
        }
        // Key by position-from-right so digit slots are stable across length changes
        const posFromRight = formatted.length - 1 - i;
        return <Digit key={`d-${posFromRight}`} digit={char} />;
      })}
    </span>
  );
}
