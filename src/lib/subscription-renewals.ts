import { eq, and, lte, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, subscriptions, paymentLinks } from "./db";

function addInterval(date: Date, interval: string): Date {
  const next = new Date(date);
  if (interval === "week") next.setDate(next.getDate() + 7);
  else if (interval === "year") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export async function processSubscriptionRenewals(): Promise<number> {
  const now = new Date();

  const due = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        isNotNull(subscriptions.currentPeriodEnd),
        lte(subscriptions.currentPeriodEnd, now)
      )
    );

  let renewed = 0;

  for (const sub of due) {
    if (!sub.paymentLinkId) continue;

    const [oldLink] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.id, sub.paymentLinkId))
      .limit(1);

    if (!oldLink) continue;

    const periodStart = sub.currentPeriodEnd ?? now;
    const periodEnd = addInterval(periodStart, sub.interval);
    const shortCode = nanoid(10);
    const wasPaid = oldLink.status === "paid";

    if (oldLink.status === "active") {
      await db
        .update(paymentLinks)
        .set({ status: "expired" })
        .where(eq(paymentLinks.id, oldLink.id));
    }

    const [newLink] = await db
      .insert(paymentLinks)
      .values({
        userId: sub.userId,
        title: sub.planName,
        description: `Subscription renewal (${sub.interval}ly)`,
        amount: sub.amount,
        currency: oldLink.currency,
        network: oldLink.network,
        shortCode,
        depositAddress: oldLink.depositAddress,
        walletId: oldLink.walletId,
        derivationIndex: oldLink.derivationIndex,
        status: "active",
        expiry: periodEnd,
      })
      .returning();

    await db
      .update(subscriptions)
      .set({
        paymentLinkId: newLink.id,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: wasPaid ? "active" : "past_due",
      })
      .where(eq(subscriptions.id, sub.id));

    renewed++;
  }

  const pastDue = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.status, "past_due"));

  for (const sub of pastDue) {
    if (!sub.paymentLinkId) continue;
    const [link] = await db
      .select({ status: paymentLinks.status })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, sub.paymentLinkId))
      .limit(1);
    if (link?.status === "paid") {
      await db
        .update(subscriptions)
        .set({ status: "active" })
        .where(eq(subscriptions.id, sub.id));
    }
  }

  return renewed;
}
