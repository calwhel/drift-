import { and, eq } from "drizzle-orm";
import { db, paymentLinks } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { deriveDepositAddress } from "../wallet/derive";

export interface EvmDepositSource {
  derivationIndex: number | null;
  address: string;
  balance: number;
}

const BALANCE_FETCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function findEvmDepositSourcesWithBalance(
  userId: string,
  network: string
): Promise<EvmDepositSource[]> {
  const links = await db
    .select({
      derivationIndex: paymentLinks.derivationIndex,
      depositAddress: paymentLinks.depositAddress,
    })
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.userId, userId),
        eq(paymentLinks.currency, "USDT"),
        eq(paymentLinks.network, network)
      )
    );

  const addressMap = new Map<string, number | null>();

  for (const link of links) {
    const address =
      link.depositAddress?.trim() ||
      (link.derivationIndex != null
        ? deriveDepositAddress(link.derivationIndex, "USDT", network)
        : null);
    if (!address) continue;

    if (!addressMap.has(address)) {
      addressMap.set(address, link.derivationIndex ?? null);
    } else if (link.derivationIndex != null) {
      addressMap.set(address, link.derivationIndex);
    }
  }

  const sources: EvmDepositSource[] = [];
  let i = 0;

  for (const [address, derivationIndex] of Array.from(addressMap.entries())) {
    if (i++ > 0) await sleep(BALANCE_FETCH_DELAY_MS);

    const onChain = await fetchOnChainBalance(address, "USDT", network);
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
