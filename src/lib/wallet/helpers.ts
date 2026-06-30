import { eq, and } from "drizzle-orm";
import { db, wallets } from "../db";
import { defaultNetworkForCurrency } from "../constants";

export async function getWalletForCurrencyAndNetwork(
  userId: string,
  currency: string,
  network: string
) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(
      and(
        eq(wallets.userId, userId),
        eq(wallets.currency, currency),
        eq(wallets.network, network)
      )
    )
    .limit(1);

  return wallet ?? null;
}

export async function getDefaultWalletForCurrency(userId: string, currency: string) {
  const network = defaultNetworkForCurrency(currency);
  return getWalletForCurrencyAndNetwork(userId, currency, network);
}
