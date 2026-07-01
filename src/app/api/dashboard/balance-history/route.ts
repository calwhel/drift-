import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { db, transactions, withdrawals } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const RANGE_DAYS: Record<string, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};

function formatLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const range = req.nextUrl.searchParams.get("range") ?? "30D";
    const days = RANGE_DAYS[range] ?? 30;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const [txRows, withdrawalRows] = await Promise.all([
      db
        .select({
          createdAt: transactions.createdAt,
          netAmount: transactions.netAmount,
          status: transactions.status,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.status, "completed"),
            gte(transactions.createdAt, start)
          )
        ),
      db
        .select({
          createdAt: withdrawals.createdAt,
          amount: withdrawals.amount,
          status: withdrawals.status,
        })
        .from(withdrawals)
        .where(and(eq(withdrawals.userId, user.id), gte(withdrawals.createdAt, start))),
    ]);

    type DayBucket = { inflow: number; outflow: number };
    const buckets = new Map<string, DayBucket>();

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { inflow: 0, outflow: 0 });
    }

    for (const tx of txRows) {
      const key = new Date(tx.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.inflow += Number(tx.netAmount ?? 0);
    }

    for (const w of withdrawalRows) {
      if (w.status === "failed") continue;
      const key = new Date(w.createdAt).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.outflow += Number(w.amount);
    }

    let cumulative = 0;
    const chart = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { inflow, outflow }]) => {
        cumulative += inflow - outflow;
        const date = new Date(`${key}T12:00:00`);
        return {
          day: formatLabel(date),
          balance: Math.max(0, Math.round(cumulative * 100) / 100),
        };
      });

    return NextResponse.json({ range, chart });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
