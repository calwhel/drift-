import { and, eq } from "drizzle-orm";
import { db, paymentLinks } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { deriveDepositAddress } from "./derive";

export interface SplDepositSource {
  derivationIndex: number | null;
  address: string;
  balance: number;
}

const BALANCE_FETCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function findSplDepositSourcesWithBalance(
  userId: string,
  currency: string
): Promise<SplDepositSource[]> {
  const links = await db
    .select({
      derivationIndex: paymentLinks.derivationIndex,
      depositAddress: paymentLinks.depositAddress,
    })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.userId, userId),
        eq(paymentLinks.currency, currency),
        eq(paymentLinks.network, "SPL")
      )
    );

  const addressMap = new Map<string, number | null>();

  for (const link of links) {
    const address =
      link.depositAddress?.trim() ||
      (link.derivationIndex != null
        ? deriveDepositAddress(link.derivationIndex, currency, "SPL")
        : null);
    if (!address) continue;

    if (!addressMap.has(address)) {
      addressMap.set(address, link.derivationIndex ?? null);
    } else if (link.derivationIndex != null) {
      addressMap.set(address, link.derivationIndex);
    }
  }

  const sources: SplDepositSource[] = [];
  let i = 0;

  for (const [address, derivationIndex] of Array.from(addressMap.entries())) {
    if (i++ > 0) await sleep(BALANCE_FETCH_DELAY_MS);

    const onChain = await fetchOnChainBalance(address, currency, "SPL");
    if (onChain.error) {
      throw new Error(
        `Could not verify on-chain balance for deposit ${address.slice(0, 8)}… (${onChain.error}). Try again in a minute.`
      );
    }

    const balance = onChain.amount ?? 0;
    if (balance > 0.000001) {
      sources.push({ derivationIndex, address, balance });
    }
  }

  return sources.sort((a, b) => b.balance - a.balance);
}
