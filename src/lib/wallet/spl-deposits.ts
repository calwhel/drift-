import { and, eq, isNotNull } from "drizzle-orm";
import { db, paymentLinks } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { deriveDepositAddress } from "./derive";

export interface SplDepositSource {
  derivationIndex: number;
  address: string;
  balance: number;
}

/** Deposit addresses that still hold USDT from payment links (ledger-only settlement mode). */
export async function findSplDepositSourcesWithBalance(
  userId: string,
  walletId: string
): Promise<SplDepositSource[]> {
  const links = await db
    .select({ derivationIndex: paymentLinks.derivationIndex })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.userId, userId),
        eq(paymentLinks.walletId, walletId),
        eq(paymentLinks.currency, "USDT"),
        eq(paymentLinks.network, "SPL"),
        isNotNull(paymentLinks.derivationIndex)
      )
    );

  const indexes = Array.from(
    new Set(
      links
        .map((l) => l.derivationIndex)
        .filter((i): i is number => i != null)
    )
  );

  const sources: SplDepositSource[] = [];

  for (const derivationIndex of indexes) {
    const address = deriveDepositAddress(derivationIndex, "USDT", "SPL");
    const onChain = await fetchOnChainBalance(address, "USDT", "SPL");
    const balance = onChain.amount ?? 0;
    if (balance > 0.000001) {
      sources.push({ derivationIndex, address, balance });
    }
  }

  return sources.sort((a, b) => b.balance - a.balance);
}
