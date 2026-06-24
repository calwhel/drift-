import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, paymentLinks } from "@/lib/db";

const schema = z.object({
  customer_email: z.string().email().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ shortcode: string }> }
) {
  try {
    const { shortcode } = await params;
    const body = await req.json();
    const data = schema.parse(body);

    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(and(eq(paymentLinks.shortCode, shortcode), eq(paymentLinks.status, "active")))
      .limit(1);

    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }
    if (link.expiry && link.expiry < new Date()) {
      return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
    }

    await db
      .update(paymentLinks)
      .set({
        customerEmail: data.customer_email ?? null,
      })
      .where(eq(paymentLinks.id, link.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save customer email" }, { status: 500 });
  }
}
