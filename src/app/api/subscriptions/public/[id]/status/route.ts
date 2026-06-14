import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscriptions } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const [sub] = await db
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      depositAddress: subscriptions.depositAddress,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      network: subscriptions.network,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      planName: subscriptions.planName,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, params.id))
    .limit(1);

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: sub.id,
    status: sub.status,
    deposit_address: sub.depositAddress,
    amount: sub.amount,
    currency: sub.currency,
    network: sub.network,
    current_period_end: sub.currentPeriodEnd,
    plan_name: sub.planName,
    payment_status:
      sub.status === "active"
        ? "completed"
        : sub.status === "past_due"
          ? "past_due"
          : "pending",
  });
}
