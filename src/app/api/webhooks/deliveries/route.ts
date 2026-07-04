import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { db, webhookDeliveries, webhooks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const webhookId = searchParams.get("webhook_id");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  const conditions = [eq(webhooks.userId, auth.userId)];
  if (webhookId) conditions.push(eq(webhookDeliveries.webhookId, webhookId));
  if (status) conditions.push(eq(webhookDeliveries.status, status));

  const rows = await db
    .select({
      id: webhookDeliveries.id,
      webhookId: webhookDeliveries.webhookId,
      transactionId: webhookDeliveries.transactionId,
      payload: webhookDeliveries.payload,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      lastError: webhookDeliveries.lastError,
      deliveredAt: webhookDeliveries.deliveredAt,
      lastAttemptAt: webhookDeliveries.lastAttemptAt,
      nextRetryAt: webhookDeliveries.nextRetryAt,
      responseStatus: webhookDeliveries.responseStatus,
      createdAt: webhookDeliveries.createdAt,
    })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(and(...conditions))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);

  return NextResponse.json({ deliveries: rows });
}
