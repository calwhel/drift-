import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, webhooks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [deleted] = await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.userId, auth.userId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
