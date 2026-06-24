import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, platformWallets } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const updateSchema = z.object({
  address: z.string().min(1).optional(),
  label: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  return NextResponse.json(
    { error: message },
    { status: message === "Forbidden" || message === "TwoFactorRequired" ? 403 : 401 }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await params;

  const [updated] = await db
    .update(platformWallets)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(platformWallets.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }
  const { id } = await params;

  const [deleted] = await db
    .delete(platformWallets)
    .where(eq(platformWallets.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
