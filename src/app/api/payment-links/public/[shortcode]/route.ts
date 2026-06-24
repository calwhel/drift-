import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, paymentLinks, users, businessSettings } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shortcode: string }> }
) {
  const { shortcode } = await params;
  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.shortCode, shortcode))
    .limit(1);

  if (!link) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
  if (link.status === "inactive") {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }
  if (link.status === "expired" || (link.expiry && new Date(link.expiry) < new Date() && link.status !== "paid")) {
    return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
  }

  const [merchant] = await db.select().from(users).where(eq(users.id, link.userId)).limit(1);
  const [settings] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.userId, link.userId))
    .limit(1);

  return NextResponse.json({
    title: link.title,
    description: link.description,
    amount: link.amount,
    currency: link.currency,
    network: link.network,
    deposit_address: link.depositAddress,
    redirect_url: link.redirectUrl,
    expiry: link.expiry,
    status: link.status,
    customer_email: link.customerEmail,
    business_name: merchant?.businessName ?? "Business",
    branding: {
      logo_url: settings?.logoUrl ?? null,
      primary_color: settings?.primaryColor ?? "#7c3aed",
      background_color: settings?.backgroundColor ?? "#0a0a0f",
    },
  });
}
