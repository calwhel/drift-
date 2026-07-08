import { getDecimals, getTokenContract, isStablecoin, TOKEN_CONTRACTS } from "../constants";
import { blockstreamFetch, logBlockstreamError } from "./blockstream";
import { etherscanV2Fetch, parseEtherscanV2Json } from "./etherscan";
import {
  fetchTronAccount,
  parseTrc20BalanceFromAccount,
} from "./trongrid";
import { validateWalletAddress } from "../wallet/generate";
import { getEvmChain, getEvmTokenContract, getEvmTokenDecimals, isEvmUsdtNetwork } from "../evm/chains";
import { withEvmRpc } from "../evm/rpc";
import { Contract } from "ethers";

export interface OnChainWalletBalance {
  amount: number | null;
  currency: string;
  network: string;
  nativeGas: { amount: number; symbol: string } | null;
  error?: string;
}

async function fetchTrc20TokenBalance(address: string, currency: string): Promise<OnChainWalletBalance> {
  const tokenContract = getTokenContract(currency, "TRC20");
  if (!tokenContract) {
    return {
      amount: null,
      currency,
      network: "TRC20",
      nativeGas: null,
      error: `Unsupported TRC20 token: ${currency}`,
    };
  }

  try {
    const account = await fetchTronAccount(address);
    const amount = parseTrc20BalanceFromAccount(account, tokenContract);
    const trx = (account?.balance ?? 0) / 1e6;
    return {
      amount,
      currency,
      network: "TRC20",
      nativeGas: { amount: trx, symbol: "TRX" },
    };
  } catch (err) {
    return {
      amount: null,
      currency,
      network: "TRC20",
      nativeGas: null,
      error: err instanceof Error ? err.message : "Failed to fetch TRC20 balance",
    };
  }
}

async function fetchEvmTokenBalanceViaEtherscan(
  address: string,
  currency: string,
  network: string,
  apiKey: string,
  contract: string,
  chainId = 1,
  decimals?: number
): Promise<number> {
  const res = await etherscanV2Fetch(
    apiKey,
    {
      module: "account",
      action: "tokenbalance",
      contractaddress: contract,
      address,
      tag: "latest",
    },
    chainId
  );
  const result = await parseEtherscanV2Json<string>(res);
  const tokenDecimals = decimals ?? getDecimals(currency, network);
  return Number(result ?? 0) / Math.pow(10, tokenDecimals);
}

async function fetchEvmTokenBalanceRpc(
  address: string,
  chain: NonNullable<ReturnType<typeof getEvmChain>>,
  currency: string
): Promise<{ amount: number; nativeGas: number | null }> {
  const tokenContract = getEvmTokenContract(chain, currency);
  const tokenDecimals = getEvmTokenDecimals(chain, currency);
  if (!tokenContract || tokenDecimals == null) {
    throw new Error(`Token ${currency} not configured on ${chain.network}`);
  }

  return withEvmRpc(chain, async (provider) => {
    const contract = new Contract(
      tokenContract,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
    const raw = await contract.balanceOf(address);
    const amount = Number(raw) / Math.pow(10, tokenDecimals);
    let nativeGas: number | null = null;
    try {
      const native = await provider.getBalance(address);
      nativeGas = Number(native) / Math.pow(10, chain.nativeDecimals);
    } catch {
      nativeGas = null;
    }
    return { amount, nativeGas };
  });
}

async function fetchEvmStablecoinBalance(
  address: string,
  currency: string,
  network: string
): Promise<OnChainWalletBalance> {
  const chain = getEvmChain(network);

  if (!chain) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: `Unknown EVM network: ${network}`,
    };
  }

  const tokenContract = getEvmTokenContract(chain, currency);
  const tokenDecimals = getEvmTokenDecimals(chain, currency);
  if (!tokenContract || tokenDecimals == null) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: `Token ${currency} not supported on ${network}`,
    };
  }

  try {
    const rpc = await fetchEvmTokenBalanceRpc(address, chain, currency);
    return {
      amount: rpc.amount,
      currency,
      network,
      nativeGas:
        rpc.nativeGas != null ? { amount: rpc.nativeGas, symbol: chain.nativeSymbol } : null,
    };
  } catch (rpcErr) {
    console.warn(`[balances] RPC ${currency} balance failed for ${network} ${address}:`, rpcErr);
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: `Could not read ${network} ${currency} balance via RPC or Etherscan`,
    };
  }

  try {
    const amount = await fetchEvmTokenBalanceViaEtherscan(
      address,
      currency,
      network,
      apiKey,
      tokenContract,
      chain.chainId,
      tokenDecimals
    );
    let nativeGas: number | null = null;
    try {
      const res = await etherscanV2Fetch(
        apiKey,
        { module: "account", action: "balance", address, tag: "latest" },
        chain.chainId
      );
      const result = await parseEtherscanV2Json<string>(res);
      nativeGas = Number(result ?? 0) / Math.pow(10, chain.nativeDecimals);
    } catch {
      nativeGas = null;
    }

    return {
      amount,
      currency,
      network,
      nativeGas: nativeGas != null ? { amount: nativeGas, symbol: chain.nativeSymbol } : null,
    };
  } catch (err) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: err instanceof Error ? err.message : `Failed to fetch ${network} balance`,
    };
  }
}

async function fetchEvmNativeBalance(
  address: string,
  apiKey: string,
  decimals: number
): Promise<number> {
  const res = await etherscanV2Fetch(apiKey, {
    module: "account",
    action: "balance",
    address,
    tag: "latest",
  });
  const result = await parseEtherscanV2Json<string>(res);
  return Number(result ?? 0) / Math.pow(10, decimals);
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
    if (currency === "ETH") {
      const amount = await fetchEvmNativeBalance(address, apiKey, 18);
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

    const amount = await fetchEvmTokenBalanceViaEtherscan(
      address,
      currency,
      "ERC20",
      apiKey,
      contract
    );
    let ethGas: number | null = null;
    try {
      ethGas = await fetchEvmNativeBalance(address, apiKey, 18);
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

async function fetchSplTokenBalance(address: string, currency: string): Promise<OnChainWalletBalance> {
  const mintAddress = getTokenContract(currency, "SPL");
  if (!mintAddress) {
    return {
      amount: null,
      currency,
      network: "SPL",
      nativeGas: null,
      error: `Unsupported SPL token: ${currency}`,
    };
  }

  try {
    const { Connection, PublicKey } = await import("@solana/web3.js");
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");

    const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const owner = new PublicKey(address);
    const mint = new PublicKey(mintAddress);

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
      currency,
      network: "SPL",
      nativeGas: { amount: solBalance, symbol: "SOL" },
    };
  } catch (err) {
    return {
      amount: null,
      currency,
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

  if (!validateWalletAddress(trimmed, network)) {
    return {
      amount: null,
      currency,
      network,
      nativeGas: null,
      error: `Invalid ${network} address — delete and recreate this wallet`,
    };
  }

  if (network === "TRC20" && isStablecoin(currency)) {
    return fetchTrc20TokenBalance(trimmed, currency);
  }
  if (network === "ERC20") {
    return fetchErc20Balance(trimmed, currency);
  }
  if (network === "SPL" && isStablecoin(currency)) {
    return fetchSplTokenBalance(trimmed, currency);
  }
  if (isEvmUsdtNetwork(network) && isStablecoin(currency)) {
    return fetchEvmStablecoinBalance(trimmed, currency, network);
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
