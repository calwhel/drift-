import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, transactions } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const status = searchParams.get("status");
  const currency = searchParams.get("currency");
  const offset = (page - 1) * limit;

  const conditions = [eq(transactions.userId, auth.userId)];
  if (status && status !== "All") {
    conditions.push(eq(transactions.status, status.toLowerCase()));
  }
  if (currency && currency !== "All") {
    conditions.push(eq(transactions.currency, currency));
  }

  const where = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(where);

  const rows = await db
    .select()
    .from(transactions)
    .where(where)
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
