import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, paymentLinks } from "@/lib/db";
import { getPublicBrandingForUser } from "@/lib/business-settings";

export async function GET(
  _req: Request,
  { params }: { params: { shortcode: string } }
) {
  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.shortCode, params.shortcode))
    .limit(1);

  if (!link || (link.status !== "active" && link.status !== "paid")) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  if (link.expiry && new Date(link.expiry) < new Date() && link.status !== "paid") {
    return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
  }

  const branding = await getPublicBrandingForUser(link.userId);

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
    branding,
  });
}
