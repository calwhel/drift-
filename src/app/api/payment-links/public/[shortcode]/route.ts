import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, paymentLinks } from "@/lib/db";

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

  if (!link || (link.status !== "active" && link.status !== "paid")) {
    return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
  }

  if (link.expiry && new Date(link.expiry) < new Date() && link.status !== "paid") {
    return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
  }

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
  });
}
