import { and, eq, isNotNull } from "drizzle-orm";
import { db, paymentLinks } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { deriveDepositAddress } from "../wallet/derive";

export interface EvmDepositSource {
  derivationIndex: number;
  address: string;
  balance: number;
}

export async function findEvmDepositSourcesWithBalance(
  userId: string,
  walletId: string,
  network: string
): Promise<EvmDepositSource[]> {
  const links = await db
    .select({ derivationIndex: paymentLinks.derivationIndex })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.userId, userId),
        eq(paymentLinks.walletId, walletId),
        eq(paymentLinks.currency, "USDT"),
        eq(paymentLinks.network, network),
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

  const sources: EvmDepositSource[] = [];

  for (const derivationIndex of indexes) {
    const address = deriveDepositAddress(derivationIndex, "USDT", network);
    const onChain = await fetchOnChainBalance(address, "USDT", network);
    const balance = onChain.amount ?? 0;
    if (balance > 0.000001) {
      sources.push({ derivationIndex, address, balance });
    }
  }

  return sources.sort((a, b) => b.balance - a.balance);
}
