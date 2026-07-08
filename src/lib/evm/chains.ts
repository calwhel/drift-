/** EVM chain configuration for USDT/USDC — polled via RPC and optional Etherscan */

export interface EvmChainConfig {
  network: string;
  chainId: number;
  label: string;
  nativeSymbol: string;
  nativeDecimals: number;
  usdtContract: string;
  usdtDecimals: number;
  usdcContract: string;
  usdcDecimals: number;
  confirmations: number;
  /** Native gas top-up before one ERC20 transfer */
  nativeTopUp: number;
  /** Native reserve left on deposit after reclaim */
  nativeReserve: number;
  rpcEnv: string;
  defaultRpc: string;
  explorerAddress: (address: string) => string;
  gasDerivationIndex: number;
}

export const EVM_USDT_CHAINS: Record<string, EvmChainConfig> = {
  BEP20: {
    network: "BEP20",
    chainId: 56,
    label: "USDT (BEP20 / BSC)",
    nativeSymbol: "BNB",
    nativeDecimals: 18,
    usdtContract: "0x55d398326f99059fF775485246999027B3197955",
    usdtDecimals: 18,
    usdcContract: "0x8AC76A51cc950d9822BD4b59eA3ACEc7c4",
    usdcDecimals: 18,
    confirmations: 15,
    nativeTopUp: 0.0005,
    nativeReserve: 0.0001,
    rpcEnv: "BSC_RPC_URL",
    defaultRpc: "https://bsc-dataseed.binance.org",
    explorerAddress: (a) => `https://bscscan.com/address/${a}`,
    gasDerivationIndex: 200,
  },
  Polygon: {
    network: "Polygon",
    chainId: 137,
    label: "USDT (Polygon)",
    nativeSymbol: "MATIC",
    nativeDecimals: 18,
    usdtContract: "0xc2132D05D31c914a87C6611C10748Ebcb32d0d41",
    usdtDecimals: 6,
    usdcContract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdcDecimals: 6,
    confirmations: 128,
    nativeTopUp: 0.05,
    nativeReserve: 0.01,
    rpcEnv: "POLYGON_RPC_URL",
    defaultRpc: "https://polygon-bor-rpc.publicnode.com",
    explorerAddress: (a) => `https://polygonscan.com/address/${a}`,
    gasDerivationIndex: 201,
  },
  Arbitrum: {
    network: "Arbitrum",
    chainId: 42161,
    label: "USDT (Arbitrum)",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdtContract: "0xFd086bC7CD5C481DCC9EC4eb85f578c6b3228d1e0",
    usdtDecimals: 6,
    usdcContract: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcDecimals: 6,
    confirmations: 12,
    nativeTopUp: 0.0002,
    nativeReserve: 0.00005,
    rpcEnv: "ARBITRUM_RPC_URL",
    defaultRpc: "https://arb1.arbitrum.io/rpc",
    explorerAddress: (a) => `https://arbiscan.io/address/${a}`,
    gasDerivationIndex: 202,
  },
  Base: {
    network: "Base",
    chainId: 8453,
    label: "USDT (Base)",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
    usdtContract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    usdtDecimals: 6,
    usdcContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
    confirmations: 12,
    nativeTopUp: 0.0001,
    nativeReserve: 0.00002,
    rpcEnv: "BASE_RPC_URL",
    defaultRpc: "https://mainnet.base.org",
    explorerAddress: (a) => `https://basescan.org/address/${a}`,
    gasDerivationIndex: 203,
  },
  Avalanche: {
    network: "Avalanche",
    chainId: 43114,
    label: "USDT (Avalanche)",
    nativeSymbol: "AVAX",
    nativeDecimals: 18,
    usdtContract: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    usdtDecimals: 6,
    usdcContract: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcDecimals: 6,
    confirmations: 12,
    nativeTopUp: 0.01,
    nativeReserve: 0.002,
    rpcEnv: "AVALANCHE_RPC_URL",
    defaultRpc: "https://api.avax.network/ext/bc/C/rpc",
    explorerAddress: (a) => `https://snowtrace.io/address/${a}`,
    gasDerivationIndex: 204,
  },
};

export const EVM_USDT_NETWORKS = Object.keys(EVM_USDT_CHAINS);

export function getEvmChain(network: string): EvmChainConfig | null {
  return EVM_USDT_CHAINS[network] ?? null;
}

export function isEvmUsdtNetwork(network: string): boolean {
  return network in EVM_USDT_CHAINS;
}

export function getEvmTokenContract(chain: EvmChainConfig, currency: string): string | null {
  if (currency === "USDT") return chain.usdtContract;
  if (currency === "USDC") return chain.usdcContract;
  return null;
}

export function getEvmTokenDecimals(chain: EvmChainConfig, currency: string): number | null {
  if (currency === "USDT") return chain.usdtDecimals;
  if (currency === "USDC") return chain.usdcDecimals;
  return null;
}

export function getEvmRpcUrl(chain: EvmChainConfig): string {
  return process.env[chain.rpcEnv] ?? chain.defaultRpc;
}

export function isEvmAddressNetwork(network: string): boolean {
  return isEvmUsdtNetwork(network) || network === "ERC20" || network === "BEP20";
}
