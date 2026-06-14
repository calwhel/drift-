import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, paymentLinks } from "@/lib/db";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { shortcode: string } }
) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.shortCode, params.shortcode),
          eq(paymentLinks.status, "active")
        )
      )
      .limit(1);

    if (!link) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    if (link.expiry && new Date(link.expiry) < new Date()) {
      return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
    }

    await db
      .update(paymentLinks)
      .set({ customerEmail: email.toLowerCase().trim() })
      .where(eq(paymentLinks.id, link.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }
}
