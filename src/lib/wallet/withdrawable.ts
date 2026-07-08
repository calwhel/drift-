import { findTrc20DepositSourcesWithBalance } from "./tron-deposits";
import { findEvmDepositSourcesWithBalance } from "../evm/deposits";
import { findSplDepositSourcesWithBalance } from "./spl-deposits";
import { fetchOnChainBalance } from "../blockchain/balances";
import { isEvmUsdtNetwork } from "../evm/chains";

export interface WithdrawableOnChain {
  total: number;
  custodial: number;
  deposits: number;
  spendableDeposits: number;
  unspendableDeposits: number;
}

function sumSpendable(
  sources: Array<{ derivationIndex: number | null; balance: number }>
): { spendable: number; unspendable: number } {
  let spendable = 0;
  let unspendable = 0;
  for (const s of sources) {
    if (s.derivationIndex != null) spendable += s.balance;
    else unspendable += s.balance;
  }
  return { spendable, unspendable };
}

/** Spendable on-chain USDT for a merchant wallet (custodial + sweepable deposit addresses only). */
export async function getWithdrawableOnChain(
  userId: string,
  custodialAddress: string,
  currency: string,
  network: string
): Promise<WithdrawableOnChain> {
  const custodial = await fetchOnChainBalance(custodialAddress, currency, network);
  if (custodial.error) {
    throw new Error(custodial.error);
  }

  const custodialBal = custodial.amount ?? 0;

  if (network === "TRC20" && currency === "USDT") {
    const sources = await findTrc20DepositSourcesWithBalance(userId);
    const { spendable, unspendable } = sumSpendable(sources);
    return {
      total: Math.round((custodialBal + spendable) * 1e6) / 1e6,
      custodial: custodialBal,
      deposits: spendable + unspendable,
      spendableDeposits: spendable,
      unspendableDeposits: unspendable,
    };
  }

  if (isEvmUsdtNetwork(network) && currency === "USDT") {
    const sources = await findEvmDepositSourcesWithBalance(userId, network);
    const { spendable, unspendable } = sumSpendable(sources);
    return {
      total: Math.round((custodialBal + spendable) * 1e6) / 1e6,
      custodial: custodialBal,
      deposits: spendable + unspendable,
      spendableDeposits: spendable,
      unspendableDeposits: unspendable,
    };
  }

  if (network === "SPL" && currency === "USDT") {
    const sources = await findSplDepositSourcesWithBalance(userId);
    const { spendable, unspendable } = sumSpendable(sources);
    return {
      total: Math.round((custodialBal + spendable) * 1e6) / 1e6,
      custodial: custodialBal,
      deposits: spendable + unspendable,
      spendableDeposits: spendable,
      unspendableDeposits: unspendable,
    };
  }

  return {
    total: custodialBal,
    custodial: custodialBal,
    deposits: 0,
    spendableDeposits: 0,
    unspendableDeposits: 0,
  };
}
