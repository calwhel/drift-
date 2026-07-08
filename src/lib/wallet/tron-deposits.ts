import { and, eq } from "drizzle-orm";
import { db, paymentLinks } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { deriveDepositAddress } from "./derive";

export interface TronDepositSource {
  derivationIndex: number | null;
  address: string;
  balance: number;
}

const BALANCE_FETCH_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * All TRC20 USDT deposit addresses for a merchant (payment links + settlements).
 * Uses userId only — not walletId — so funds on any link are included.
 */
export async function findTrc20DepositSourcesWithBalance(
  userId: string,
  currency: string
): Promise<TronDepositSource[]> {
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
        eq(paymentLinks.network, "TRC20")
      )
    );

  const addressMap = new Map<string, number | null>();

  for (const link of links) {
    const address =
      link.depositAddress?.trim() ||
      (link.derivationIndex != null
        ? deriveDepositAddress(link.derivationIndex, currency, "TRC20")
        : null);
    if (!address) continue;

    const existing = addressMap.get(address);
    if (existing == null && link.derivationIndex != null) {
      addressMap.set(address, link.derivationIndex);
    } else if (!addressMap.has(address)) {
      addressMap.set(address, link.derivationIndex ?? null);
    }
  }

  const sources: TronDepositSource[] = [];
  let i = 0;

  for (const [address, derivationIndex] of Array.from(addressMap.entries())) {
    if (i++ > 0) await sleep(BALANCE_FETCH_DELAY_MS);

    const onChain = await fetchOnChainBalance(address, currency, "TRC20");
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

/** Sum of on-chain USDT available from custodial wallet + all deposit addresses. */
export async function getTrc20WithdrawableOnChain(
  userId: string,
  custodialAddress: string,
  currency: string
): Promise<{ total: number; custodial: number; deposits: number }> {
  const custodial = await fetchOnChainBalance(custodialAddress, currency, "TRC20");
  if (custodial.error) {
    throw new Error(custodial.error);
  }

  const custodialBal = custodial.amount ?? 0;
  const depositSources = await findTrc20DepositSourcesWithBalance(userId, currency);
  const deposits = depositSources.reduce((sum, s) => sum + s.balance, 0);

  return {
    total: Math.round((custodialBal + deposits) * 1e6) / 1e6,
    custodial: custodialBal,
    deposits,
  };
}
