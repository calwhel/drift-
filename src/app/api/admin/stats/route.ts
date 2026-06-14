import { NextResponse } from "next/server";
import { sql, eq, desc } from "drizzle-orm";
import { db, users, transactions } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  const [txCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions);

  const [completedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.status, "completed"));

  const [revenueResult] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.feeAmount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.status, "completed"));

  const [grossResult] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.status, "completed"));

  const recentTransactions = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      currency: transactions.currency,
      network: transactions.network,
      status: transactions.status,
      feeAmount: transactions.feeAmount,
      netAmount: transactions.netAmount,
      createdAt: transactions.createdAt,
      userId: transactions.userId,
      customerEmail: transactions.customerEmail,
    })
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  const recentUsers = await db
    .select({
      id: users.id,
      email: users.email,
      businessName: users.businessName,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);

  return NextResponse.json({
    totalUsers: Number(userCount?.count ?? 0),
    totalTransactions: Number(txCount?.count ?? 0),
    completedTransactions: Number(completedCount?.count ?? 0),
    platformRevenue: Number(revenueResult?.total ?? 0),
    totalGrossVolume: Number(grossResult?.total ?? 0),
    recentTransactions,
    recentUsers,
  });
}
