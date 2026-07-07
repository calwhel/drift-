/** EVM chain configuration for USDT — polled via Etherscan V2 multichain API */

export interface EvmChainConfig {
  network: string;
  chainId: number;
  label: string;
  nativeSymbol: string;
  nativeDecimals: number;
  usdtContract: string;
  usdtDecimals: number;
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

export function getEvmRpcUrl(chain: EvmChainConfig): string {
  return process.env[chain.rpcEnv] ?? chain.defaultRpc;
}

export function isEvmAddressNetwork(network: string): boolean {
  return isEvmUsdtNetwork(network) || network === "ERC20" || network === "BEP20";
}
