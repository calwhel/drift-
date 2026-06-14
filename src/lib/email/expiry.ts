import { eq, and, lt, isNotNull } from "drizzle-orm";
import { db, paymentLinks, users } from "../db";
import { sendPaymentLinkExpiredEmail } from "./send";

export async function processExpiredPaymentLinks(): Promise<number> {
  const now = new Date();

  const expiredLinks = await db
    .select({
      id: paymentLinks.id,
      title: paymentLinks.title,
      amount: paymentLinks.amount,
      currency: paymentLinks.currency,
      userId: paymentLinks.userId,
      expiryNotified: paymentLinks.expiryNotified,
    })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.status, "active"),
        isNotNull(paymentLinks.expiry),
        lt(paymentLinks.expiry, now)
      )
    );

  let processed = 0;

  for (const link of expiredLinks) {
    if (link.expiryNotified) continue;

    await db
      .update(paymentLinks)
      .set({ status: "expired", expiryNotified: true })
      .where(eq(paymentLinks.id, link.id));

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, link.userId))
      .limit(1);

    if (user?.email) {
      await sendPaymentLinkExpiredEmail(
        user.email,
        link.title,
        String(link.amount),
        link.currency
      );
    }

    processed++;
  }

  return processed;
}
