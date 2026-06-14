import { NextRequest, NextResponse } from "next/server";
import { desc, sql, eq } from "drizzle-orm";
import { db, transactions, users } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions);

  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      currency: transactions.currency,
      network: transactions.network,
      status: transactions.status,
      feeAmount: transactions.feeAmount,
      netAmount: transactions.netAmount,
      txHash: transactions.txHash,
      customerEmail: transactions.customerEmail,
      createdAt: transactions.createdAt,
      userId: transactions.userId,
      userEmail: users.email,
      businessName: users.businessName,
    })
    .from(transactions)
    .leftJoin(users, eq(transactions.userId, users.id))
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    data: rows,
    total: Number(countResult?.count ?? 0),
    page,
    limit,
  });
}
