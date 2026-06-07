import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, paymentLinks, transactions } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { shortcode: string } }
) {
  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.shortCode, params.shortcode))
    .limit(1);

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (link.expiry && link.expiry < new Date()) {
    return NextResponse.json({
      status: "expired",
      link_status: link.status,
      redirect_url: link.redirectUrl,
    });
  }

  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.paymentLinkId, link.id))
    .orderBy(desc(transactions.createdAt))
    .limit(1);

  const paymentStatus = tx?.status ?? (link.status === "paid" ? "completed" : "pending");

  return NextResponse.json({
    status: paymentStatus,
    link_status: link.status,
    amount: link.amount,
    currency: link.currency,
    redirect_url: link.redirectUrl,
    paid_at: link.paidAt,
    transaction_id: tx?.id ?? null,
    confirmations: tx?.confirmations ?? "0",
  });
}
