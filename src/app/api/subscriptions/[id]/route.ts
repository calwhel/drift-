import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, subscriptions } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["active", "cancelled"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [updated] = await db
      .update(subscriptions)
      .set({ status: data.status })
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, auth.userId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await logAudit(auth.userId, `subscription.${data.status}`, "subscription", updated.id);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
