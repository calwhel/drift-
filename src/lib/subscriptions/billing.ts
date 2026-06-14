import { eq, and, inArray, lt, sql, gte } from "drizzle-orm";
import { db, subscriptions, users, subscriptionPlans, transactions } from "../db";
import { addBillingInterval, PAST_DUE_GRACE_MS } from "./intervals";
import {
  sendSubscriptionPastDueEmail,
  sendSubscriptionPaymentEmails,
  type SubscriptionEmailDetails,
} from "../email/send";

export async function processSubscriptionPastDue(): Promise<number> {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - PAST_DUE_GRACE_MS);

  const dueSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.currentPeriodEnd, graceCutoff),
        eq(subscriptions.pastDueNotified, false)
      )
    );

  let processed = 0;

  for (const sub of dueSubs) {
    if (!sub.currentPeriodEnd || !sub.customerEmail) continue;

    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        pastDueNotified: true,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id));

    const details: SubscriptionEmailDetails = {
      planName: sub.planName ?? "Subscription",
      amount: String(sub.amount),
      currency: sub.currency,
      customerName: sub.customerName ?? sub.customerEmail,
      customerEmail: sub.customerEmail,
      interval: sub.interval,
      depositAddress: sub.depositAddress ?? undefined,
    };

    sendSubscriptionPastDueEmail(sub.customerEmail, details).catch((err) =>
      console.error("[subscription] Past due email failed:", err)
    );

    processed++;
  }

  return processed;
}

export async function activateSubscriptionAfterPayment(
  subscriptionId: string,
  transactionId: string
): Promise<void> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) return;

  const now = new Date();
  const wasPending = sub.status === "pending";
  const isLate =
    sub.status === "past_due" ||
    (sub.currentPeriodEnd !== null && sub.currentPeriodEnd < now);

  let periodStart: Date;
  if (wasPending || isLate) {
    periodStart = now;
  } else {
    periodStart = sub.currentPeriodEnd ?? now;
  }
  const periodEnd = addBillingInterval(periodStart, sub.interval);

  await db
    .update(subscriptions)
    .set({
      status: "active",
      pastDueNotified: false,
      currentPeriodStart: wasPending ? now : periodStart,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId));

  const [merchant] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, sub.userId))
    .limit(1);

  if (merchant?.email && sub.customerEmail) {
    const details: SubscriptionEmailDetails = {
      planName: sub.planName ?? "Subscription",
      amount: String(sub.amount),
      currency: sub.currency,
      customerName: sub.customerName ?? sub.customerEmail,
      customerEmail: sub.customerEmail,
      interval: sub.interval,
      periodEnd: periodEnd.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    sendSubscriptionPaymentEmails(merchant.email, sub.customerEmail, details).catch((err) =>
      console.error("[subscription] Payment confirmation email failed:", err)
    );
  }

  void transactionId;
}

export async function getSubscriptionStats(userId: string) {
  const allSubs = await db
    .select({
      status: subscriptions.status,
      amount: subscriptions.amount,
      interval: subscriptions.interval,
      cancelledAt: subscriptions.cancelledAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const active = allSubs.filter((s) => s.status === "active").length;
  const pastDue = allSubs.filter((s) => s.status === "past_due").length;
  const paused = allSubs.filter((s) => s.status === "paused").length;
  const pending = allSubs.filter((s) => s.status === "pending").length;
  const cancelled = allSubs.filter((s) => s.status === "cancelled").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCancelled = allSubs.filter(
    (s) => s.status === "cancelled" && s.cancelledAt && s.cancelledAt >= thirtyDaysAgo
  ).length;

  const churnBase = active + recentCancelled;
  const churnRate = churnBase > 0 ? Math.round((recentCancelled / churnBase) * 1000) / 10 : 0;

  const mrr = allSubs
    .filter((s) => s.status === "active" || s.status === "past_due")
    .reduce((sum, s) => {
      const amt = Number(s.amount);
      if (s.interval === "week") return sum + amt * 4.33;
      if (s.interval === "year") return sum + amt / 12;
      return sum + amt;
    }, 0);

  const revenueRows = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${transactions.netAmount} AS numeric)), 0)` })
    .from(transactions)
    .innerJoin(subscriptions, eq(transactions.subscriptionId, subscriptions.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(transactions.status, "completed"),
        gte(transactions.createdAt, thirtyDaysAgo)
      )
    );

  const revenue30d = Number(revenueRows[0]?.total ?? 0);

  const [planCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.userId, userId), eq(subscriptionPlans.status, "active")));

  return {
    active,
    pastDue,
    paused,
    pending,
    cancelled,
    churnRate,
    mrr: Math.round(mrr * 100) / 100,
    revenue30d: Math.round(revenue30d * 100) / 100,
    planCount: planCount?.count ?? 0,
  };
}

export async function getActiveSubscriptionAddresses(): Promise<
  Map<string, { currency: string; network: string }>
> {
  const rows = await db
    .select({
      depositAddress: subscriptions.depositAddress,
      currency: subscriptions.currency,
      network: subscriptions.network,
    })
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, ["pending", "active", "past_due"]),
        sql`${subscriptions.depositAddress} IS NOT NULL`
      )
    );

  const map = new Map<string, { currency: string; network: string }>();
  for (const row of rows) {
    if (!row.depositAddress) continue;
    map.set(row.depositAddress, { currency: row.currency, network: row.network });
  }
  return map;
}
