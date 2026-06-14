import { eq, and } from "drizzle-orm";
import { db, wallets } from "../db";

export async function getDefaultWalletForCurrency(userId: string, currency: string) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency)))
    .limit(1);

  return wallet ?? null;
}
