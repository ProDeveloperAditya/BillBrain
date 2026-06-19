"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
  ];
  const showRules = password.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-sm"
    >
      {state?.error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </motion.div>
      )}

      <form
        action={formAction}
        className={cn("glass rounded-2xl p-7 space-y-4", "ring-1 ring-white/[0.06]")}
      >
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Full name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="name"
              name="name"
              placeholder="Alex Johnson"
              autoComplete="name"
              required
              className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-9 h-10 bg-white/[0.04] border-white/[0.08] focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password rules */}
          {showRules && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex gap-3 pt-1"
            >
              {rules.map((rule) => (
                <span
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1 text-[11px] transition-colors",
                    rule.met ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <CheckCircle2 className={cn("h-3 w-3 shrink-0", rule.met ? "text-primary" : "text-muted-foreground/40")} />
                  {rule.label}
                </span>
              ))}
            </motion.div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Confirm password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
              className="pl-9 h-10 bg-white/[0.04] border-white/[0.08] focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={pending}
          className="w-full h-10 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all mt-1"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
          By creating an account you agree to our{" "}
          <span className="text-foreground/60 cursor-pointer hover:text-primary transition-colors">Terms</span>{" "}
          and{" "}
          <span className="text-foreground/60 cursor-pointer hover:text-primary transition-colors">Privacy Policy</span>.
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary font-medium hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
