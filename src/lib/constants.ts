export const FEE_RATE = 0.015;
export const NET_RATE = 0.985;

import { EVM_USDT_CHAINS } from "./evm/chains";

export const STABLECOIN_CURRENCIES = ["USDT", "USDC"] as const;
export type StablecoinCurrency = (typeof STABLECOIN_CURRENCIES)[number];

/** Networks merchants can use for USDT and USDC */
export const STABLECOIN_NETWORKS = [
  { network: "TRC20", label: "TRC20 (Tron)" },
  { network: "SPL", label: "Solana (SPL)" },
  ...Object.values(EVM_USDT_CHAINS).map((c) => ({
    network: c.network,
    label: c.label,
  })),
] as const;

/** @deprecated use STABLECOIN_NETWORKS */
export const USDT_NETWORKS = STABLECOIN_NETWORKS;

export type UsdtNetwork = (typeof STABLECOIN_NETWORKS)[number]["network"];
export type StablecoinNetwork = UsdtNetwork;

/** USDC is enabled on Solana, Base, and Polygon (launch networks) */
export const USDC_MERCHANT_NETWORKS = [
  { network: "SPL", label: "USDC (Solana)" },
  { network: "Base", label: "USDC (Base)" },
  { network: "Polygon", label: "USDC (Polygon)" },
] as const;

export type UsdcNetwork = (typeof USDC_MERCHANT_NETWORKS)[number]["network"];

/** Networks available for new merchant wallets and payment links */
export const MERCHANT_WALLET_NETWORKS = [
  ...STABLECOIN_NETWORKS.map((n) => ({
    currency: "USDT" as const,
    network: n.network,
    label: n.label,
  })),
  ...USDC_MERCHANT_NETWORKS.map((n) => ({
    currency: "USDC" as const,
    network: n.network,
    label: n.label,
  })),
];

export function merchantNetworksForCurrency(currency: string) {
  if (currency === "USDC") return USDC_MERCHANT_NETWORKS;
  return STABLECOIN_NETWORKS;
}

export function defaultNetworkForCurrency(currency: string): string {
  if (currency === "USDT") return "TRC20";
  if (currency === "USDC") return "SPL";
  return NETWORKS[currency as SupportedCurrency]?.network ?? "TRC20";
}

export type WalletType = "connected" | "generated";

/** Platform fee collection addresses (admin) */
export const PLATFORM_WALLET_NETWORKS = MERCHANT_WALLET_NETWORKS;

/** Legacy default network per currency (used when network omitted) */
export const NETWORKS = {
  USDT: { network: "TRC20", confirmations: 1, decimals: 6 },
  USDC: { network: "SPL", confirmations: 32, decimals: 6 },
  BTC: { network: "Bitcoin", confirmations: 3, decimals: 8 },
  ETH: { network: "ERC20", confirmations: 12, decimals: 18 },
  BNB: { network: "BEP20", confirmations: 15, decimals: 18 },
  SOL: { network: "Solana", confirmations: 32, decimals: 9 },
} as const;

export type SupportedCurrency = keyof typeof NETWORKS;

/** Per currency+network configuration */
export const NETWORK_CONFIG: Record<string, { confirmations: number; decimals: number }> = {
  "USDT|TRC20": { confirmations: 1, decimals: 6 },
  "USDT|SPL": { confirmations: 32, decimals: 6 },
  "USDT|ERC20": { confirmations: 12, decimals: 6 },
  "USDC|TRC20": { confirmations: 1, decimals: 6 },
  "USDC|SPL": { confirmations: 32, decimals: 6 },
  "USDC|ERC20": { confirmations: 12, decimals: 6 },
  ...Object.fromEntries(
    Object.values(EVM_USDT_CHAINS).flatMap((c) => [
      [`USDT|${c.network}`, { confirmations: c.confirmations, decimals: c.usdtDecimals }],
      [`USDC|${c.network}`, { confirmations: c.confirmations, decimals: c.usdcDecimals }],
    ])
  ),
  "BTC|Bitcoin": { confirmations: 3, decimals: 8 },
  "ETH|ERC20": { confirmations: 12, decimals: 18 },
  "SOL|Solana": { confirmations: 32, decimals: 9 },
};

export const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  TRC20: {
    USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    USDC: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
  },
  ERC20: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  SPL: {
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  ...Object.fromEntries(
    Object.values(EVM_USDT_CHAINS).map((c) => [
      c.network,
      { USDT: c.usdtContract, USDC: c.usdcContract },
    ])
  ),
};

export const CHART_COLORS: Record<string, string> = {
  USDT: "#22c55e",
  BTC: "#f59e0b",
  USDC: "#3b82f6",
  ETH: "#8b5cf6",
  BNB: "#eab308",
  SOL: "#14b8a6",
};

export function networkConfigKey(currency: string, network: string) {
  return `${currency}|${network}`;
}

export function isStablecoin(currency: string): currency is StablecoinCurrency {
  return STABLECOIN_CURRENCIES.includes(currency as StablecoinCurrency);
}

export function isStablecoinNetwork(network: string): boolean {
  return STABLECOIN_NETWORKS.some((n) => n.network === network);
}

export function getTokenContract(currency: string, network: string): string | undefined {
  return TOKEN_CONTRACTS[network]?.[currency];
}

export function getNetworkLabel(currency: string, network: string): string {
  const found = MERCHANT_WALLET_NETWORKS.find(
    (n) => n.currency === currency && n.network === network
  );
  if (found) return found.label;
  if (currency === "USDT" && network === "ERC20") return "USDT (ERC20 — legacy)";
  return `${currency} (${network})`;
}

export function isMerchantNetworkEnabled(currency: string, network: string): boolean {
  return MERCHANT_WALLET_NETWORKS.some(
    (n) => n.currency === currency && n.network === network
  );
}

export function disabledNetworkMessage(network: string): string | null {
  if (network === "ERC20") {
    return "Ethereum (ERC20) is disabled. Use USDT or USDC on Solana, Base, Polygon, or other supported networks.";
  }
  return null;
}

export function isLedgerOnlyStablecoin(currency: string, network: string): boolean {
  return isStablecoin(currency) && isMerchantNetworkEnabled(currency, network);
}

/** @deprecated use isLedgerOnlyStablecoin */
export function isUsdtLedgerOnly(currency: string, network: string): boolean {
  return isLedgerOnlyStablecoin(currency, network);
}

export function getHoldingAddress(currency: string, network: string): string {
  const key = `HOLDING_WALLET_${currency}_${network.replace(/\s/g, "_").toUpperCase()}`;
  const address = process.env[key];
  if (!address) {
    throw new Error(`Missing holding wallet env: ${key}`);
  }
  return address;
}

export function getRequiredConfirmations(currency: string, network?: string): number {
  if (network) {
    return NETWORK_CONFIG[networkConfigKey(currency, network)]?.confirmations ?? 12;
  }
  const cfg = NETWORKS[currency as SupportedCurrency];
  return cfg?.confirmations ?? 12;
}

export function getDecimals(currency: string, network?: string): number {
  if (network) {
    return NETWORK_CONFIG[networkConfigKey(currency, network)]?.decimals ?? 6;
  }
  const cfg = NETWORKS[currency as SupportedCurrency];
  return cfg?.decimals ?? 6;
}

/** @deprecated use isStablecoinNetwork */
export function isUsdtNetwork(network: string): boolean {
  return isStablecoinNetwork(network);
}

export function isActivePaymentNetwork(network: string): boolean {
  return isStablecoinNetwork(network);
}
