import { PrismaClient } from "@prisma/client";

// Ensure the connection string has generous timeouts so the app survives
// Neon free-tier auto-suspend wake-ups. Without this, the first query after the
// DB idles can time out (default 5s) and crash the page. Applied in code so it
// works regardless of how DATABASE_URL is set in the host environment.
function resilientUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "15");
    return u.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resilientUrl(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
