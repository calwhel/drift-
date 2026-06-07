import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, apiKeys } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth || auth.via !== "session") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deleted] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, params.id), eq(apiKeys.userId, auth.userId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
