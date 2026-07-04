import { createHmac } from "crypto";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import { db, webhooks, webhookDeliveries, transactions } from "./db";

export interface WebhookPayload {
  event: string;
  transaction_id: string;
  status: string;
  amount: string;
  currency: string;
  fee: string | null;
  net_amount: string | null;
  timestamp: string;
}

const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 8);

function retryDelayMs(attempts: number): number {
  return Math.min(Math.pow(2, attempts) * 30_000, 60 * 60 * 1000);
}

export function signWebhookPayload(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function dispatchWebhooks(
  userId: string,
  transactionId: string,
  event: string
) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!tx) return;

  const userWebhooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.userId, userId));

  const payload: WebhookPayload = {
    event,
    transaction_id: tx.id,
    status: tx.status,
    amount: tx.amount,
    currency: tx.currency,
    fee: tx.feeAmount,
    net_amount: tx.netAmount,
    timestamp: tx.updatedAt.toISOString(),
  };

  for (const hook of userWebhooks) {
    const events = hook.events as string[];
    if (!events.includes(event) && !events.includes("*")) continue;

    await db.insert(webhookDeliveries).values({
      webhookId: hook.id,
      transactionId: tx.id,
      payload,
      status: "pending",
      attempts: "0",
      nextRetryAt: new Date(),
    });
  }
}

export async function processPendingWebhooks() {
  const now = new Date();
  const pending = await db
    .select({
      delivery: webhookDeliveries,
      webhook: webhooks,
    })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(
      and(
        eq(webhookDeliveries.status, "pending"),
        or(isNull(webhookDeliveries.nextRetryAt), lte(webhookDeliveries.nextRetryAt, now))
      )
    );

  for (const { delivery, webhook } of pending) {
    const attempts = Number(delivery.attempts);
    if (attempts >= MAX_ATTEMPTS) {
      await db
        .update(webhookDeliveries)
        .set({ status: "failed", lastAttemptAt: now })
        .where(eq(webhookDeliveries.id, delivery.id));
      continue;
    }

    const body = JSON.stringify(delivery.payload);
    const signature = signWebhookPayload(webhook.secret, body);
    const attemptAt = new Date();

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Drift-Signature": signature,
          "X-Drift-Event": (delivery.payload as WebhookPayload).event ?? "unknown",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      const responseBody = (await res.text()).slice(0, 500);

      if (res.ok) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "delivered",
            attempts: String(attempts + 1),
            deliveredAt: attemptAt,
            lastAttemptAt: attemptAt,
            responseStatus: res.status,
            responseBody,
            lastError: null,
          })
          .where(eq(webhookDeliveries.id, delivery.id));
      } else {
        throw new Error(`HTTP ${res.status}: ${responseBody.slice(0, 120)}`);
      }
    } catch (err) {
      const nextAttempts = attempts + 1;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const failed = nextAttempts >= MAX_ATTEMPTS;

      await db
        .update(webhookDeliveries)
        .set({
          attempts: String(nextAttempts),
          lastError: errorMessage,
          lastAttemptAt: attemptAt,
          status: failed ? "failed" : "pending",
          nextRetryAt: failed ? null : new Date(attemptAt.getTime() + retryDelayMs(nextAttempts)),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    }
  }
}

export async function retryWebhookDelivery(deliveryId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhooks.userId, userId)))
    .limit(1);

  if (!row) return false;

  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: "0",
      lastError: null,
      nextRetryAt: new Date(),
      deliveredAt: null,
      responseStatus: null,
      responseBody: null,
    })
    .where(eq(webhookDeliveries.id, deliveryId));

  return true;
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string
): boolean {
  const expected = signWebhookPayload(secret, body);
  return expected === signature;
}
