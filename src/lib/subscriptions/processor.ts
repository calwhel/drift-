import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, paymentLinks, subscriptions, users } from "@/lib/db";
import { NETWORKS, SupportedCurrency, getHoldingAddress } from "@/lib/constants";
import { deriveDepositAddress, getNextDerivationIndex } from "@/lib/wallet/derive";
import { getDefaultWalletForCurrency } from "@/lib/wallet/helpers";
import { sendSubscriptionDueEmails } from "@/lib/email/notifications";

function addInterval(date: Date, interval: string) {
  const next = new Date(date);
  if (interval === "week") next.setDate(next.getDate() + 7);
  else if (interval === "year") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

async function createSubscriptionPaymentLink(
  sub: typeof subscriptions.$inferSelect,
  cycleStart: Date,
  cycleEnd: Date
) {
  const currency = sub.currency.toUpperCase();
  const network = NETWORKS[currency as SupportedCurrency]?.network ?? "TRC20";
  const derivationIndex = await getNextDerivationIndex();
  const shortCode = nanoid(10);

  let depositAddress: string;
  let walletId: string | null = null;
  const userWallet = await getDefaultWalletForCurrency(sub.userId, currency);
  if (userWallet) {
    depositAddress = userWallet.address;
    walletId = userWallet.id;
  } else {
    try {
      depositAddress = deriveDepositAddress(derivationIndex, currency, network);
    } catch {
      depositAddress = getHoldingAddress(currency, network);
    }
  }

  const [link] = await db
    .insert(paymentLinks)
    .values({
      userId: sub.userId,
      title: sub.planName,
      description: `Subscription: ${sub.interval}ly`,
      amount: sub.amount,
      currency,
      network,
      shortCode,
      depositAddress,
      derivationIndex: walletId ? null : derivationIndex,
      walletId,
      customerEmail: sub.customerEmail,
      status: "active",
      expiry: cycleEnd,
    })
    .returning();

  await db
    .update(subscriptions)
    .set({
      paymentLinkId: link.id,
      currentPeriodStart: cycleStart,
      currentPeriodEnd: cycleEnd,
      status: "active",
    })
    .where(eq(subscriptions.id, sub.id));

  return link;
}

export async function processRecurringSubscriptions(): Promise<number> {
  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "active")));
  const pastDueRows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "past_due")));
  const all = [...rows, ...pastDueRows];

  let processed = 0;

  for (const sub of all) {
    try {
      if (!sub.currentPeriodEnd) continue;
      if (sub.currentPeriodEnd > now) continue;

      const [merchant] = await db
        .select({ email: users.email, businessName: users.businessName })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);
      if (!merchant) continue;

      const [currentLink] = sub.paymentLinkId
        ? await db.select().from(paymentLinks).where(eq(paymentLinks.id, sub.paymentLinkId)).limit(1)
        : [undefined];
      const linkPaid = currentLink?.status === "paid";

      if (linkPaid) {
        const cycleStart = sub.status === "past_due" ? now : sub.currentPeriodEnd;
        const nextPeriodEnd = addInterval(new Date(cycleStart), sub.interval);
        const newLink = await createSubscriptionPaymentLink(sub, cycleStart, nextPeriodEnd);

        await sendSubscriptionDueEmails({
          merchantEmail: merchant.email,
          merchantName: merchant.businessName,
          customerEmail: sub.customerEmail,
          customerName: sub.customerName,
          planName: sub.planName,
          amount: sub.amount,
          currency: sub.currency,
          interval: sub.interval,
          checkoutShortcode: newLink.shortCode,
        }).catch((err) => {
          console.warn("Subscription due email failed:", err);
        });

        processed++;
        continue;
      }

      let dueLink = currentLink;
      let createdReplacementLink = false;
      if (!dueLink || dueLink.status === "inactive" || dueLink.status === "expired") {
        const graceStart = now;
        const graceEnd = new Date(now);
        graceEnd.setDate(graceEnd.getDate() + 7);
        dueLink = await createSubscriptionPaymentLink(sub, graceStart, graceEnd);
        createdReplacementLink = true;
      }

      if (sub.status !== "past_due") {
        await db
          .update(subscriptions)
          .set({ status: "past_due" })
          .where(eq(subscriptions.id, sub.id));
      }

      if (sub.status !== "past_due" || createdReplacementLink) {
        await sendSubscriptionDueEmails({
          merchantEmail: merchant.email,
          merchantName: merchant.businessName,
          customerEmail: sub.customerEmail,
          customerName: sub.customerName,
          planName: sub.planName,
          amount: sub.amount,
          currency: sub.currency,
          interval: sub.interval,
          checkoutShortcode: dueLink.shortCode,
        }).catch((err) => {
          console.warn("Subscription due email failed:", err);
        });
      }

      processed++;
    } catch (err) {
      console.warn(`Subscription processor failed for ${sub.id}:`, err);
    }
  }

  return processed;
}
