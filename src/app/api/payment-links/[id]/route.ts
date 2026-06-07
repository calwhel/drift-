import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, paymentLinks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "expired"]).optional(),
  redirect_url: z.string().url().optional().nullable(),
  expiry: z.string().datetime().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.id, params.id), eq(paymentLinks.userId, auth.userId)))
    .limit(1);

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(link);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [link] = await db
      .update(paymentLinks)
      .set({
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.redirect_url !== undefined && { redirectUrl: data.redirect_url }),
        ...(data.expiry !== undefined && {
          expiry: data.expiry ? new Date(data.expiry) : null,
        }),
      })
      .where(and(eq(paymentLinks.id, params.id), eq(paymentLinks.userId, auth.userId)))
      .returning();

    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await logAudit(auth.userId, "payment_link.updated", "payment_link", link.id);
    return NextResponse.json(link);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [link] = await db
    .update(paymentLinks)
    .set({ status: "inactive" })
    .where(and(eq(paymentLinks.id, params.id), eq(paymentLinks.userId, auth.userId)))
    .returning();

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit(auth.userId, "payment_link.deleted", "payment_link", link.id);
  return NextResponse.json({ ok: true });
}
