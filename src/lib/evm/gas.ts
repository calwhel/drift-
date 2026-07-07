import { Wallet, JsonRpcProvider, parseEther } from "ethers";
import { etherscanV2Fetch, parseEtherscanV2Json } from "../blockchain/etherscan";
import { derivePrivateKey, deriveDepositAddress } from "../wallet/derive";
import { getEvmChain, getEvmRpcUrl, type EvmChainConfig } from "./chains";

async function fetchNativeBalance(chain: EvmChainConfig, address: string): Promise<number> {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) return 0;

  try {
    const res = await etherscanV2Fetch(
      apiKey,
      { module: "account", action: "balance", address, tag: "latest" },
      chain.chainId
    );
    const result = await parseEtherscanV2Json<string>(res);
    return Number(result ?? 0) / Math.pow(10, chain.nativeDecimals);
  } catch {
    const provider = new JsonRpcProvider(getEvmRpcUrl(chain));
    const balance = await provider.getBalance(address);
    return Number(balance) / Math.pow(10, chain.nativeDecimals);
  }
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
  const provider = new JsonRpcProvider(getEvmRpcUrl(chain));
  const pk = fromPrivateKey.startsWith("0x") ? fromPrivateKey : `0x${fromPrivateKey}`;
  const signer = new Wallet(pk, provider);
  const tx = await signer.sendTransaction({
    to: toAddress,
    value: parseEther(amountNative.toFixed(12)),
  });
  const receipt = await tx.wait();
  return receipt!.hash;
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
