export const FEE_RATE = 0.015; // 1.5%
export const NET_RATE = 0.985; // 98.5%

export const NETWORKS = {
  USDT: { network: "TRC20", confirmations: 20 },
  USDC: { network: "ERC20", confirmations: 12 },
  BTC: { network: "Bitcoin", confirmations: 3 },
  ETH: { network: "ERC20", confirmations: 12 },
  BNB: { network: "BEP20", confirmations: 15 },
  SOL: { network: "Solana", confirmations: 32 },
} as const;

export type SupportedCurrency = keyof typeof NETWORKS;

export function getHoldingAddress(currency: string, network: string): string {
  const key = `HOLDING_WALLET_${currency}_${network.replace(/\s/g, "_").toUpperCase()}`;
  const address = process.env[key];
  if (!address) {
    throw new Error(`Missing holding wallet env: ${key}`);
  }
  return address;
}

export function getRequiredConfirmations(currency: string): number {
  const cfg = NETWORKS[currency as SupportedCurrency];
  return cfg?.confirmations ?? 12;
}
