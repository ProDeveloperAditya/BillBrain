import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Prisma, no bcrypt, no Node.js-only imports.
// Used by middleware to validate JWT tokens without a DB round-trip.
export const authConfig = {
  // Trust the deployment host (Vercel/Neon/custom domain) so Auth.js v5 doesn't
  // reject requests with an UntrustedHost error in production.
  trustHost: true,
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const protectedPaths = [
        "/dashboard",
        "/transactions",
        "/subscriptions",
        "/leaks",
        "/assistant",
        "/imports",
        "/insights",
        "/settings",
        "/onboarding",
      ];

      const isProtected = protectedPaths.some((p) => path.startsWith(p));
      const isAuthPage = path === "/sign-in" || path === "/sign-up";

      if (isProtected && !isLoggedIn) {
        const redirectUrl = new URL("/sign-in", nextUrl);
        redirectUrl.searchParams.set("callbackUrl", path);
        return Response.redirect(redirectUrl);
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
