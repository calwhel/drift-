/** Network fees deducted from the merchant's withdrawal (covers on-chain gas). */
const WITHDRAWAL_NETWORK_FEES: Record<string, number> = {
  "USDT|TRC20": 2,
  "USDT|SPL": 0.05,
  "USDT|BEP20": 0.15,
  "USDT|Polygon": 0.05,
  "USDT|Arbitrum": 0.1,
  "USDT|Base": 0.05,
  "USDT|Avalanche": 0.1,
  "USDC|SPL": 0.05,
  "USDC|Polygon": 0.05,
  "USDC|Base": 0.05,
};

export function getWithdrawalNetworkFee(currency: string, network: string): number {
  return WITHDRAWAL_NETWORK_FEES[`${currency}|${network}`] ?? 0;
}

export function getWithdrawalNetworkFees() {
  return { ...WITHDRAWAL_NETWORK_FEES };
}

export interface WithdrawalQuote {
  grossAmount: number;
  networkFee: number;
  netAmount: number;
}

/** grossAmount = total debited from ledger; netAmount = sent on-chain to destination */
export function quoteWithdrawal(
  currency: string,
  network: string,
  grossAmount: number
): WithdrawalQuote {
  const networkFee = getWithdrawalNetworkFee(currency, network);
  const netAmount = Math.round((grossAmount - networkFee) * 1e6) / 1e6;
  return { grossAmount, networkFee, netAmount };
}

export function validateWithdrawalAmount(
  currency: string,
  network: string,
  grossAmount: number,
  walletBalance: number
): string | null {
  if (grossAmount <= 0) return "Amount must be greater than zero";

  const { networkFee, netAmount } = quoteWithdrawal(currency, network, grossAmount);

  if (networkFee > 0 && grossAmount <= networkFee) {
    return `Minimum withdrawal is more than ${networkFee} ${currency} (network fee is ${networkFee} ${currency})`;
  }

  if (netAmount < 0.01) {
    return "Amount too small after network fee";
  }

  if (grossAmount > walletBalance + 0.000001) {
    return "Insufficient balance";
  }

  return null;
}
