import { NextResponse } from "next/server";
import { eq, sql, and, gte } from "drizzle-orm";
import { db, transactions } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const all = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id));

    const completed = all.filter((t) => t.status === "completed");
    const pending = all.filter((t) => t.status === "pending" || t.status === "confirming");

    const totalGross = completed.reduce((s, t) => s + Number(t.amount), 0);
    const totalFees = completed.reduce((s, t) => s + Number(t.feeAmount ?? 0), 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recent = await db
      .select({
        date: sql<string>`DATE(${transactions.createdAt})`,
        revenue: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.status, "completed"),
          gte(transactions.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${transactions.createdAt})`);

    const byCurrency = completed.reduce(
      (acc, t) => {
        acc[t.currency] = (acc[t.currency] ?? 0) + Number(t.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      totalGross,
      totalFees,
      totalPayments: all.length,
      completed: completed.length,
      pending: pending.length,
      revenueChart: recent,
      paymentMethods: byCurrency,
      recentTransactions: all.slice(0, 10),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
