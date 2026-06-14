export const FEE_RATE = 0.015;
export const NET_RATE = 0.985;

export const PLATFORM_WALLET_NETWORKS = [
  { currency: "USDT", network: "TRC20", label: "USDT (TRC20)" },
  { currency: "BTC", network: "Bitcoin", label: "Bitcoin" },
  { currency: "ETH", network: "ERC20", label: "Ethereum" },
  { currency: "USDC", network: "ERC20", label: "USDC (ERC20)" },
  { currency: "SOL", network: "Solana", label: "Solana" },
] as const;

export const NETWORKS = {
  USDT: { network: "TRC20", confirmations: 20, decimals: 6 },
  USDC: { network: "ERC20", confirmations: 12, decimals: 6 },
  BTC: { network: "Bitcoin", confirmations: 3, decimals: 8 },
  ETH: { network: "ERC20", confirmations: 12, decimals: 18 },
  BNB: { network: "BEP20", confirmations: 15, decimals: 18 },
  SOL: { network: "Solana", confirmations: 32, decimals: 9 },
} as const;

export type SupportedCurrency = keyof typeof NETWORKS;

export const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  TRC20: { USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  ERC20: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  BEP20: { BNB: "native" },
};

export const CHART_COLORS: Record<string, string> = {
  USDT: "#22c55e",
  BTC: "#f59e0b",
  USDC: "#3b82f6",
  ETH: "#8b5cf6",
  BNB: "#eab308",
  SOL: "#14b8a6",
};

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

export function getDecimals(currency: string): number {
  const cfg = NETWORKS[currency as SupportedCurrency];
  return cfg?.decimals ?? 6;
}
