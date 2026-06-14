import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, subscriptionPlans, subscriptions } from "@/lib/db";
import { deriveDepositAddress, getNextDerivationIndex } from "@/lib/wallet/derive";
import { getHoldingAddress } from "@/lib/constants";
import { addBillingInterval } from "@/lib/subscriptions/intervals";

const schema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().max(255).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { shortcode: string } }
) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.shortCode, params.shortcode),
          eq(subscriptionPlans.status, "active")
        )
      )
      .limit(1);

    if (!plan) {
      return NextResponse.json({ error: "Subscription plan not found" }, { status: 404 });
    }

    const derivationIndex = await getNextDerivationIndex();
    let depositAddress: string;

    try {
      depositAddress = deriveDepositAddress(derivationIndex, plan.currency, plan.network);
    } catch {
      depositAddress = getHoldingAddress(plan.currency, plan.network);
    }

    const now = new Date();
    const periodEnd = addBillingInterval(now, plan.interval);

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: plan.userId,
        planId: plan.id,
        customerEmail: data.customer_email.toLowerCase().trim(),
        customerName: data.customer_name?.trim() || null,
        planName: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        network: plan.network,
        interval: plan.interval,
        depositAddress,
        derivationIndex,
        walletId: plan.walletId,
        status: "pending",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    return NextResponse.json({
      id: sub.id,
      deposit_address: sub.depositAddress,
      amount: sub.amount,
      currency: sub.currency,
      network: sub.network,
      status: sub.status,
      current_period_end: sub.currentPeriodEnd,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
