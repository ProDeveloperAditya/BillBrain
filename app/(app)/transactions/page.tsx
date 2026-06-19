import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { TransactionsClient } from "@/components/transactions/TransactionsClient";
import type { TxRow, TxFilters } from "@/components/transactions/TransactionsClient";
import type { CategoryName } from "@prisma/client";

export const metadata = { title: "Transactions — BillBrain AI" };

const PAGE_SIZE = 25;

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const sp = await searchParams;

  const q        = str(sp.q);
  const category = str(sp.category) as CategoryName | undefined;
  const from     = str(sp.from);
  const to       = str(sp.to);
  const recurring = sp.recurring === "1" ? true : undefined;
  const flagged   = sp.flagged   === "1" ? true : undefined;
  const page      = Math.max(1, parseInt(str(sp.page) ?? "1", 10) || 1);

  const filters: TxFilters = { q, category, from, to, recurring, flagged };

  const where: Prisma.TransactionWhereInput = {
    userId: session.user.id,
    isDuplicate: false,
    ...(q && {
      normalizedMerchant: { contains: q, mode: Prisma.QueryMode.insensitive },
    }),
    ...(category && { category }),
    ...(from || to
      ? {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to   && { lte: new Date(`${to}T23:59:59.999Z`) }),
          },
        }
      : {}),
    ...(recurring !== undefined && { isRecurring: recurring }),
    ...(flagged   !== undefined && { isFlagged:   flagged }),
  };

  const [rawRows, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { sourceFile: { select: { filename: true } } },
    }),
    db.transaction.count({ where }),
  ]);

  const transactions: TxRow[] = rawRows.map((t) => ({
    id:                 t.id,
    date:               t.date.toISOString(),
    amount:             Number(t.amount),
    type:               t.type,
    category:           t.category,
    normalizedMerchant: t.normalizedMerchant ?? t.rawDescription ?? null,
    rawDescription:     t.rawDescription ?? null,
    isRecurring:        t.isRecurring,
    isFlagged:          t.isFlagged,
    isDuplicate:        t.isDuplicate,
    tags:               t.tags,
    confidence:         t.confidence,
    currency:           t.currency,
    sourceFileName:     t.sourceFile?.filename ?? null,
  }));

  return (
    <TransactionsClient
      transactions={transactions}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      filters={filters}
    />
  );
}
