import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db, settlements } from "@/lib/db";
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

  const rows = await db
    .select()
    .from(settlements)
    .orderBy(desc(settlements.createdAt))
    .limit(50);

  const [counts] = await db
    .select({
      pending: sql<number>`count(*) filter (where ${settlements.status} = 'pending')`,
      completed: sql<number>`count(*) filter (where ${settlements.status} = 'completed')`,
      failed: sql<number>`count(*) filter (where ${settlements.status} = 'failed')`,
      queued: sql<number>`count(*) filter (where ${settlements.status} = 'queued')`,
      platformFeeCompleted: sql<number>`count(*) filter (where ${settlements.type} = 'platform_fee' and ${settlements.status} = 'completed')`,
      platformFeeFailed: sql<number>`count(*) filter (where ${settlements.type} = 'platform_fee' and ${settlements.status} = 'failed')`,
      platformFeePending: sql<number>`count(*) filter (where ${settlements.type} = 'platform_fee' and ${settlements.status} = 'pending')`,
    })
    .from(settlements);

  return NextResponse.json({
    counts: {
      pending: Number(counts?.pending ?? 0),
      completed: Number(counts?.completed ?? 0),
      failed: Number(counts?.failed ?? 0),
      queued: Number(counts?.queued ?? 0),
      platformFeeCompleted: Number(counts?.platformFeeCompleted ?? 0),
      platformFeeFailed: Number(counts?.platformFeeFailed ?? 0),
      platformFeePending: Number(counts?.platformFeePending ?? 0),
    },
    settlements: rows,
  });
}
