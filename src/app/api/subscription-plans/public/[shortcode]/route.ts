import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, subscriptionPlans } from "@/lib/db";
import { getPublicBrandingForUser } from "@/lib/business-settings";

export async function GET(
  _req: Request,
  { params }: { params: { shortcode: string } }
) {
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

  const branding = await getPublicBrandingForUser(plan.userId);

  return NextResponse.json({
    name: plan.name,
    description: plan.description,
    amount: plan.amount,
    currency: plan.currency,
    network: plan.network,
    interval: plan.interval,
    branding,
  });
}
