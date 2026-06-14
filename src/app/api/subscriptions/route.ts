import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, subscriptions } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { getSubscriptionStats } from "@/lib/subscriptions/billing";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  if (url.searchParams.get("stats") === "1") {
    const stats = await getSubscriptionStats(auth.userId);
    return NextResponse.json(stats);
  }

  const rows = await db
    .select({
      id: subscriptions.id,
      planId: subscriptions.planId,
      planName: subscriptions.planName,
      customerEmail: subscriptions.customerEmail,
      customerName: subscriptions.customerName,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      network: subscriptions.network,
      interval: subscriptions.interval,
      status: subscriptions.status,
      depositAddress: subscriptions.depositAddress,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      createdAt: subscriptions.createdAt,
      cancelledAt: subscriptions.cancelledAt,
      pausedAt: subscriptions.pausedAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, auth.userId))
    .orderBy(desc(subscriptions.createdAt));

  return NextResponse.json(rows);
}
