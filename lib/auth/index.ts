// Auth utilities — thin re-export so app code imports from @/lib/auth, not from @/auth directly.
// Keeps the import graph clean when auth.ts changes (e.g. adding OAuth providers).

export { auth, signIn, signOut } from "@/auth";
