import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const transactions = await db.transaction.findMany({
    where: { userId: session.user.id, isDuplicate: false },
    orderBy: { date: "desc" },
    select: {
      date: true,
      amount: true,
      type: true,
      category: true,
      normalizedMerchant: true,
      rawDescription: true,
      isRecurring: true,
      isFlagged: true,
      currency: true,
      tags: true,
      confidence: true,
    },
  });

  const HEADER = [
    "Date", "Merchant", "Description", "Amount", "Type",
    "Category", "Currency", "Recurring", "Flagged", "Confidence", "Tags",
  ];

  const rows = transactions.map((t) => [
    t.date.toISOString().slice(0, 10),
    t.normalizedMerchant ?? "",
    t.rawDescription ?? "",
    Number(t.amount).toFixed(2),
    t.type,
    t.category,
    t.currency,
    t.isRecurring ? "Yes" : "No",
    t.isFlagged ? "Yes" : "No",
    t.confidence.toFixed(2),
    t.tags.join(";"),
  ]);

  const csv = [HEADER, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const filename = `billbrain-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
