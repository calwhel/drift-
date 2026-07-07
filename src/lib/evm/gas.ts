import { Wallet, parseEther } from "ethers";
import { etherscanV2Fetch, parseEtherscanV2Json } from "../blockchain/etherscan";
import { derivePrivateKey, deriveDepositAddress } from "../wallet/derive";
import { getEvmChain, EVM_USDT_CHAINS, type EvmChainConfig } from "./chains";
import { withEvmRpc } from "./rpc";

async function fetchNativeBalance(chain: EvmChainConfig, address: string): Promise<number> {
  // Prefer public RPC fallbacks — works with zero extra env vars.
  try {
    return await withEvmRpc(chain, async (provider) => {
      const balance = await provider.getBalance(address);
      return Number(balance) / Math.pow(10, chain.nativeDecimals);
    });
  } catch (rpcErr) {
    console.warn(`[evm-gas] RPC balance failed for ${chain.network} ${address}:`, rpcErr);
  }

  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (apiKey) {
    try {
      const res = await etherscanV2Fetch(
        apiKey,
        { module: "account", action: "balance", address, tag: "latest" },
        chain.chainId
      );
      const result = await parseEtherscanV2Json<string>(res);
      return Number(result ?? 0) / Math.pow(10, chain.nativeDecimals);
    } catch (err) {
      console.warn(`[evm-gas] Etherscan balance failed for ${chain.network}:`, err);
    }
  }

  return 0;
}

function getGasWalletPrivateKey(chain: EvmChainConfig): string {
  return derivePrivateKey(chain.gasDerivationIndex, chain.network);
}

function getGasWalletAddress(chain: EvmChainConfig): string {
  return deriveDepositAddress(chain.gasDerivationIndex, "USDT", chain.network);
}

async function sendNativeToken(
  chain: EvmChainConfig,
  fromPrivateKey: string,
  toAddress: string,
  amountNative: number
): Promise<string> {
  return withEvmRpc(chain, async (provider) => {
    const pk = fromPrivateKey.startsWith("0x") ? fromPrivateKey : `0x${fromPrivateKey}`;
    const signer = new Wallet(pk, provider);
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseEther(amountNative.toFixed(12)),
    });
    const receipt = await tx.wait();
    return receipt!.hash;
  });
}

/** Top up deposit address with native gas from the chain gas wallet (master mnemonic). */
export async function fundEvmNativeIfNeeded(network: string, toAddress: string): Promise<void> {
  const chain = getEvmChain(network);
  if (!chain) return;

  const gasAddress = getGasWalletAddress(chain);
  if (toAddress.toLowerCase() === gasAddress.toLowerCase()) return;

  const balance = await fetchNativeBalance(chain, toAddress);
  if (balance >= chain.nativeTopUp) return;

  const amountToSend = Math.min(
    Math.max(chain.nativeTopUp - balance, chain.nativeTopUp * 0.5),
    chain.nativeTopUp * 2
  );

  const gasKey = getGasWalletPrivateKey(chain);
  const gasBalance = await fetchNativeBalance(chain, gasAddress);
  if (gasBalance < amountToSend + chain.nativeReserve) {
    throw new Error(
      `${chain.nativeSymbol} gas wallet needs funding for ${chain.label} withdrawals. ` +
        `Send ${chain.nativeSymbol} to ${gasAddress}`
    );
  }

  await sendNativeToken(chain, gasKey, toAddress, amountToSend);
}

/** Reclaim leftover native gas to the chain gas wallet after a USDT transfer. */
export async function reclaimEvmNativeToGasWallet(
  network: string,
  fromPrivateKey: string,
  fromAddress: string
): Promise<void> {
  const chain = getEvmChain(network);
  if (!chain) return;

  const gasAddress = getGasWalletAddress(chain);
  if (fromAddress.toLowerCase() === gasAddress.toLowerCase()) return;

  const balance = await fetchNativeBalance(chain, fromAddress);
  const reclaimable = balance - chain.nativeReserve;
  if (reclaimable < chain.nativeReserve) return;

  try {
    await sendNativeToken(chain, fromPrivateKey, gasAddress, reclaimable);
  } catch (err) {
    console.warn(`[evm-gas] ${chain.network} reclaim from ${fromAddress} failed:`, err);
  }
}

export function getEvmGasWalletAddress(network: string): string | null {
  const chain = getEvmChain(network);
  if (!chain) return null;
  return getGasWalletAddress(chain);
}

export interface EvmGasWalletStatus {
  network: string;
  label: string;
  address: string;
  nativeSymbol: string;
  nativeBalance: number;
  ready: boolean;
  message: string;
  balanceError?: string;
}

export async function getEvmGasWalletStatus(network: string): Promise<EvmGasWalletStatus | null> {
  const chain = getEvmChain(network);
  if (!chain) return null;

  const address = getGasWalletAddress(chain);
  let nativeBalance = 0;
  let balanceError: string | undefined;

  try {
    nativeBalance = await fetchNativeBalance(chain, address);
  } catch (err) {
    balanceError = err instanceof Error ? err.message : "Could not fetch balance";
  }

  const ready = nativeBalance >= chain.nativeTopUp * 3;

  let message: string;
  if (balanceError) {
    message = `Could not read ${chain.label} gas balance — public RPC endpoints may be temporarily unavailable.`;
  } else if (nativeBalance < chain.nativeTopUp) {
    message = `${chain.nativeSymbol} gas wallet needs funding for ${chain.label} withdrawals. Send ${chain.nativeSymbol} to ${address}`;
  } else if (!ready) {
    message = `${chain.label} gas wallet is low (${nativeBalance.toFixed(6)} ${chain.nativeSymbol}).`;
  } else {
    message = `${chain.label} gas wallet is ready.`;
  }

  return {
    network: chain.network,
    label: chain.label,
    address,
    nativeSymbol: chain.nativeSymbol,
    nativeBalance,
    ready,
    message,
    balanceError,
  };
}

export async function getAllEvmGasWalletStatuses(): Promise<EvmGasWalletStatus[]> {
  const statuses: EvmGasWalletStatus[] = [];
  for (const chain of Object.values(EVM_USDT_CHAINS)) {
    const status = await getEvmGasWalletStatus(chain.network);
    if (status) statuses.push(status);
  }
  return statuses;
}
