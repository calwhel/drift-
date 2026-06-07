import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
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
    });
  }
}

export async function processPendingWebhooks() {
  const pending = await db
    .select({
      delivery: webhookDeliveries,
      webhook: webhooks,
    })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhookDeliveries.webhookId, webhooks.id))
    .where(eq(webhookDeliveries.status, "pending"));

  for (const { delivery, webhook } of pending) {
    const attempts = Number(delivery.attempts);
    if (attempts >= 3) {
      await db
        .update(webhookDeliveries)
        .set({ status: "failed" })
        .where(eq(webhookDeliveries.id, delivery.id));
      continue;
    }

    const body = JSON.stringify(delivery.payload);
    const signature = signWebhookPayload(webhook.secret, body);

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

      if (res.ok) {
        await db
          .update(webhookDeliveries)
          .set({ status: "delivered", attempts: String(attempts + 1) })
          .where(eq(webhookDeliveries.id, delivery.id));
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      const nextAttempts = attempts + 1;
      await db
        .update(webhookDeliveries)
        .set({
          attempts: String(nextAttempts),
          lastError: err instanceof Error ? err.message : "Unknown error",
          status: nextAttempts >= 3 ? "failed" : "pending",
        })
        .where(eq(webhookDeliveries.id, delivery.id));
    }
  }
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string
): boolean {
  const expected = signWebhookPayload(secret, body);
  return expected === signature;
}
