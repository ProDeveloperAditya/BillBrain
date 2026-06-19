"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">This page hit a snag</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        This usually happens on the free database’s first wake-up after it’s been
        idle. Try again — it almost always loads on the second attempt.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Button onClick={() => reset()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
      {error.digest && (
        <p className="mt-5 font-mono text-[11px] text-muted-foreground/50">ref: {error.digest}</p>
      )}
    </div>
  );
}
