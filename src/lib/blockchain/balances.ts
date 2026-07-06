import { getDecimals, TOKEN_CONTRACTS } from "../constants";
import { blockstreamFetch, logBlockstreamError } from "./blockstream";
import { validateWalletAddress } from "../wallet/generate";

export interface OnChainWalletBalance {
  amount: number | null;
  currency: string;
  network: string;
  nativeGas: { amount: number; symbol: string } | null;
  error?: string;
}

const USDT_TRC20 = TOKEN_CONTRACTS.TRC20.USDT;

function tronHeaders(): Record<string, string> {
  const apiKey = process.env.TRONGRID_API_KEY;
  return apiKey ? { "TRON-PRO-API-KEY": apiKey } : {};
}

async function fetchTronAccount(address: string) {
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    headers: tronHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`TronGrid HTTP ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: Array<{
      balance?: number;
      trc20?: Array<Record<string, string>>;
    }>;
  };
  return body.data?.[0];
}

function parseTrc20Balance(account: { trc20?: Array<Record<string, string>> } | undefined, contract: string): number {
  for (const entry of account?.trc20 ?? []) {
    for (const [token, value] of Object.entries(entry)) {
      if (token === contract) {
        return Number(value) / 1e6;
      }
    }
  }
  return 0;
}

async function fetchTrc20UsdtBalance(address: string): Promise<OnChainWalletBalance> {
  try {
    const account = await fetchTronAccount(address);
    const amount = parseTrc20Balance(account, USDT_TRC20);
    const trx = (account?.balance ?? 0) / 1e6;
    return {
      amount,
      currency: "USDT",
      network: "TRC20",
      nativeGas: { amount: trx, symbol: "TRX" },
    };
  } catch (err) {
    return {
      amount: null,
      currency: "USDT",
      network: "TRC20",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch TRC20 balance",
    };
  }
}

async function fetchEvmTokenBalance(
  address: string,
  currency: string,
  network: string,
  apiUrl: string,
  apiKey: string,
  contract: string
): Promise<number> {
  const res = await fetch(
    `${apiUrl}?module=account&action=tokenbalance&contractaddress=${contract}&address=${address}&tag=latest&apikey=${apiKey}`
  );
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string; result?: string; message?: string };
  if (data.status !== "1") {
    throw new Error(data.message ?? "Token balance lookup failed");
  }
  const decimals = getDecimals(currency, network);
  return Number(data.result ?? 0) / Math.pow(10, decimals);
}

async function fetchEvmNativeBalance(
  address: string,
  apiUrl: string,
  apiKey: string,
  decimals: number
): Promise<number> {
  const res = await fetch(
    `${apiUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`
  );
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string; result?: string; message?: string };
  if (data.status !== "1") {
    throw new Error(data.message ?? "Native balance lookup failed");
  }
  return Number(data.result ?? 0) / Math.pow(10, decimals);
}

async function fetchErc20Balance(address: string, currency: string): Promise<OnChainWalletBalance> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return {
      amount: null,
      currency,
      network: "ERC20",
      nativeGas: null,
      error: "ETHERSCAN_API_KEY not set",
    };
  }

  try {
    const apiUrl = "https://api.etherscan.io/api";

    if (currency === "ETH") {
      const amount = await fetchEvmNativeBalance(address, apiUrl, apiKey, 18);
      return {
        amount,
        currency: "ETH",
        network: "ERC20",
        nativeGas: { amount, symbol: "ETH" },
      };
    }

    const contract = TOKEN_CONTRACTS.ERC20[currency as keyof typeof TOKEN_CONTRACTS.ERC20];
    if (!contract) {
      return {
        amount: null,
        currency,
        network: "ERC20",
        nativeGas: null,
        error: `Unsupported ERC20 token: ${currency}`,
      };
    }

    const amount = await fetchEvmTokenBalance(address, currency, "ERC20", apiUrl, apiKey, contract);
    let ethGas: number | null = null;
    try {
      ethGas = await fetchEvmNativeBalance(address, apiUrl, apiKey, 18);
    } catch {
      ethGas = null;
    }

    return {
      amount,
      currency,
      network: "ERC20",
      nativeGas: ethGas != null ? { amount: ethGas, symbol: "ETH" } : null,
    };
  } catch (err) {
    return {
      amount: null,
      currency,
      network: "ERC20",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch ERC20 balance",
    };
  }
}

async function fetchSplUsdtBalance(address: string): Promise<OnChainWalletBalance> {
  try {
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");

    const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const owner = new PublicKey(address);
    const mint = new PublicKey(TOKEN_CONTRACTS.SPL.USDT);

    const solBalance = (await connection.getBalance(owner)) / 1e9;

    let amount = 0;
    try {
      const ata = await getAssociatedTokenAddress(mint, owner);
      const tokenAccount = await connection.getTokenAccountBalance(ata);
      amount = Number(tokenAccount.value.uiAmount ?? 0);
    } catch {
      amount = 0;
    }

    return {
      amount,
      currency: "USDT",
      network: "SPL",
      nativeGas: { amount: solBalance, symbol: "SOL" },
    };
  } catch (err) {
    return {
      amount: null,
      currency: "USDT",
      network: "SPL",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch SPL balance",
    };
  }
}

async function fetchSolanaNativeBalance(address: string): Promise<OnChainWalletBalance> {
  try {
    const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
    });
    if (!res.ok) throw new Error(`Solana RPC HTTP ${res.status}`);
    const data = (await res.json()) as { result?: { value?: number }; error?: { message?: string } };
    if (data.error) throw new Error(data.error.message ?? "Solana RPC error");
    const amount = (data.result?.value ?? 0) / 1e9;
    return {
      amount,
      currency: "SOL",
      network: "Solana",
      nativeGas: { amount, symbol: "SOL" },
    };
  } catch (err) {
    return {
      amount: null,
      currency: "SOL",
      network: "Solana",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch Solana balance",
    };
  }
}

async function fetchBitcoinBalance(address: string): Promise<OnChainWalletBalance> {
  if (!validateWalletAddress(address, "Bitcoin")) {
    return {
      amount: null,
      currency: "BTC",
      network: "Bitcoin",
      nativeGas: null,
      error: "Invalid Bitcoin address",
    };
  }

  try {
    const res = await blockstreamFetch(`/address/${encodeURIComponent(address)}`);
    if (!res.ok) throw new Error(`Blockstream HTTP ${res.status}`);
    const data = (await res.json()) as {
      chain_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
      mempool_stats?: { funded_txo_sum?: number; spent_txo_sum?: number };
    };
    const funded =
      (data.chain_stats?.funded_txo_sum ?? 0) + (data.mempool_stats?.funded_txo_sum ?? 0);
    const spent =
      (data.chain_stats?.spent_txo_sum ?? 0) + (data.mempool_stats?.spent_txo_sum ?? 0);
    const amount = (funded - spent) / 1e8;
    return {
      amount,
      currency: "BTC",
      network: "Bitcoin",
      nativeGas: null,
    };
  } catch (err) {
    logBlockstreamError(`balance ${address}`, err);
    return {
      amount: null,
      currency: "BTC",
      network: "Bitcoin",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch Bitcoin balance",
    };
  }
}

export async function fetchOnChainBalance(
  address: string,
  currency: string,
  network: string
): Promise<OnChainWalletBalance> {
  const trimmed = address.trim();
  if (!trimmed) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: "Address is empty",
    };
  }

  if (network === "TRC20" && currency === "USDT") {
    return fetchTrc20UsdtBalance(trimmed);
  }
  if (network === "ERC20") {
    return fetchErc20Balance(trimmed, currency);
  }
  if (network === "SPL" && currency === "USDT") {
    return fetchSplUsdtBalance(trimmed);
  }
  if (network === "Solana" && currency === "SOL") {
    return fetchSolanaNativeBalance(trimmed);
  }
  if (network === "Bitcoin" && currency === "BTC") {
    return fetchBitcoinBalance(trimmed);
  }

  return {
    amount: null,
    currency,
    network,
    nativeGas: null,
    error: `On-chain balance not supported for ${currency} (${network})`,
  };
}

export async function fetchOnChainBalancesForWallets<
  T extends { address: string; currency: string; network: string },
>(items: T[]): Promise<Array<T & { onChain: OnChainWalletBalance }>> {
  const results = await Promise.all(
    items.map(async (item) => ({
      ...item,
      onChain: await fetchOnChainBalance(item.address, item.currency, item.network),
    }))
  );
  return results;
}
