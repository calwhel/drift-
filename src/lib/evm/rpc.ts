import { JsonRpcProvider } from "ethers";
import type { EvmChainConfig } from "./chains";
import { getEvmChain } from "./chains";

/** Public RPC fallbacks when env/default endpoints fail (polygon-rpc.com often requires API keys). */
const RPC_FALLBACKS: Record<string, string[]> = {
  BEP20: [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://rpc.ankr.com/bsc",
  ],
  Polygon: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://rpc.ankr.com/polygon",
    "https://1rpc.io/matic",
  ],
  Arbitrum: [
    "https://arb1.arbitrum.io/rpc",
    "https://rpc.ankr.com/arbitrum",
  ],
  Base: [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
    "https://rpc.ankr.com/base",
  ],
  Avalanche: [
    "https://api.avax.network/ext/bc/C/rpc",
    "https://rpc.ankr.com/avalanche",
  ],
};

export function getEvmRpcUrls(chain: EvmChainConfig): string[] {
  const fromEnv = process.env[chain.rpcEnv]?.trim();
  const urls = [fromEnv, chain.defaultRpc, ...(RPC_FALLBACKS[chain.network] ?? [])].filter(
    (u): u is string => Boolean(u)
  );
  return Array.from(new Set(urls));
}

export async function withEvmRpc<T>(
  chain: EvmChainConfig,
  fn: (provider: JsonRpcProvider, rpcUrl: string) => Promise<T>
): Promise<T> {
  const urls = getEvmRpcUrls(chain);
  let lastError: unknown;

  for (const rpcUrl of urls) {
    try {
      const provider = new JsonRpcProvider(rpcUrl, chain.chainId, { staticNetwork: true });
      return await fn(provider, rpcUrl);
    } catch (err) {
      lastError = err;
      console.warn(`[evm-rpc] ${chain.network} ${rpcUrl} failed:`, err);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`All RPC endpoints failed for ${chain.network}`);
}

export async function fetchEvmNativeBalanceRpc(
  network: string,
  address: string
): Promise<{ balance: number; error?: string }> {
  const chain = getEvmChain(network);
  if (!chain) return { balance: 0, error: `Unknown network: ${network}` };

  try {
    const balance = await withEvmRpc(chain, async (provider) => {
      const wei = await provider.getBalance(address);
      return Number(wei) / Math.pow(10, chain.nativeDecimals);
    });
    return { balance };
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC balance fetch failed";
    return { balance: 0, error: message };
  }
}
