import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, subscriptions } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

const patchSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = patchSchema.parse(body);

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, params.id), eq(subscriptions.userId, auth.userId)))
      .limit(1);

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const now = new Date();
    let updates: Partial<typeof subscriptions.$inferInsert> = { updatedAt: now };

    if (action === "pause") {
      if (sub.status === "cancelled") {
        return NextResponse.json({ error: "Cannot pause a cancelled subscription" }, { status: 400 });
      }
      updates = { ...updates, status: "paused", pausedAt: now };
    } else if (action === "resume") {
      if (sub.status !== "paused") {
        return NextResponse.json({ error: "Subscription is not paused" }, { status: 400 });
      }
      updates = {
        ...updates,
        status: sub.currentPeriodEnd && sub.currentPeriodEnd < now ? "past_due" : "active",
        pausedAt: null,
      };
    } else if (action === "cancel") {
      updates = { ...updates, status: "cancelled", cancelledAt: now };
    }

    const [updated] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, params.id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
