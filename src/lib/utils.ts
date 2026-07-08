import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function getUserInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

import { getEvmChain } from "./evm/chains";

export function blockExplorerAddressUrl(address: string, network: string): string {
  switch (network) {
    case "TRC20":
      return `https://tronscan.org/#/address/${address}`;
    case "ERC20":
      return `https://etherscan.io/address/${address}`;
    case "SPL":
    case "Solana":
      return `https://solscan.io/account/${address}`;
    case "Bitcoin":
      return `https://blockstream.info/address/${address}`;
    default: {
      const chain = getEvmChain(network);
      if (chain) return chain.explorerAddress(address);
      return `https://etherscan.io/address/${address}`;
    }
  }
}

export function blockExplorerTxUrl(txHash: string, network: string): string {
  const hash = txHash.split(",")[0]?.trim() ?? txHash;
  switch (network) {
    case "TRC20":
      return `https://tronscan.org/#/transaction/${hash}`;
    case "ERC20":
      return `https://etherscan.io/tx/${hash}`;
    case "SPL":
    case "Solana":
      return `https://solscan.io/tx/${hash}`;
    case "Bitcoin":
      return `https://blockstream.info/tx/${hash}`;
    default: {
      const chain = getEvmChain(network);
      if (chain) {
        const base = chain.explorerAddress("0x0").replace(/\/address\/0x0$/, "");
        return `${base}/tx/${hash}`;
      }
      return `https://etherscan.io/tx/${hash}`;
    }
  }
}
