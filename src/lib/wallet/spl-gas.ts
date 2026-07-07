import { deriveDepositAddress, derivePrivateKey } from "./derive";
import { isMasterWalletConfigured } from "./master-wallet";

/** Master mnemonic index for the Solana gas wallet (SOL for SPL transfers + ATA creation). */
export const SPL_GAS_DERIVATION_INDEX = 205;

/** Target SOL on a deposit address before one SPL USDT transfer */
export const SOL_TOP_UP_TARGET = 0.01;

/** Minimum SOL in gas wallet to fund one deposit */
export const MIN_SOL_GAS_OPERATION = 0.005;

export interface SplGasWalletStatus {
  configured: boolean;
  address: string | null;
  solBalance: number;
  ready: boolean;
  message: string;
}

async function fetchSolBalanceLamports(address: string): Promise<number> {
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
  if (!res.ok) return 0;
  const data = (await res.json()) as { result?: { value?: number } };
  return data.result?.value ?? 0;
}

export async function fetchSolBalance(address: string): Promise<number> {
  return (await fetchSolBalanceLamports(address)) / 1e9;
}

export function getSplGasWalletAddress(): string | null {
  if (!isMasterWalletConfigured()) return null;
  return deriveDepositAddress(SPL_GAS_DERIVATION_INDEX, "USDT", "SPL");
}

export function getSplGasWalletPrivateKey(): string {
  if (!isMasterWalletConfigured()) {
    throw new Error("MASTER_WALLET_MNEMONIC is not configured");
  }
  return derivePrivateKey(SPL_GAS_DERIVATION_INDEX, "SPL");
}

async function sendSol(fromPrivateKey: string, toAddress: string, amountSol: number): Promise<string> {
  const { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
    await import("@solana/web3.js");

  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");

  const pkHex = fromPrivateKey.startsWith("0x") ? fromPrivateKey.slice(2) : fromPrivateKey;
  const bytes = Buffer.from(pkHex, "hex");
  const { Keypair } = await import("@solana/web3.js");
  const fromKeypair =
    bytes.length === 64 ? Keypair.fromSecretKey(bytes) : Keypair.fromSeed(bytes.slice(0, 32));

  const lamports = Math.round(amountSol * 1e9);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports,
    })
  );

  return sendAndConfirmTransaction(connection, tx, [fromKeypair]);
}

export async function getSplGasWalletStatus(): Promise<SplGasWalletStatus> {
  if (!isMasterWalletConfigured()) {
    return {
      configured: false,
      address: null,
      solBalance: 0,
      ready: false,
      message: "Add MASTER_WALLET_MNEMONIC in Railway to enable the Solana gas wallet.",
    };
  }

  const address = getSplGasWalletAddress()!;
  const solBalance = await fetchSolBalance(address);
  const ready = solBalance >= SOL_TOP_UP_TARGET * 2;

  let message: string;
  if (solBalance < MIN_SOL_GAS_OPERATION) {
    message = `Solana gas wallet needs SOL for SPL withdrawals. Send SOL to ${address}`;
  } else if (!ready) {
    message = `Solana gas wallet is low (${solBalance.toFixed(4)} SOL). Send more SOL for reliable SPL withdrawals.`;
  } else {
    message = "Solana gas wallet is ready for SPL withdrawals.";
  }

  return { configured: true, address, solBalance, ready, message };
}

/** Top up a deposit address with SOL from the gas wallet before an SPL USDT transfer. */
export async function fundSolIfNeeded(toAddress: string): Promise<void> {
  const gasAddress = getSplGasWalletAddress();
  if (!gasAddress || toAddress === gasAddress) return;

  const balance = await fetchSolBalance(toAddress);
  if (balance >= SOL_TOP_UP_TARGET) return;

  const sendSolAmount = Math.min(
    Math.max(SOL_TOP_UP_TARGET - balance, 0.005),
    SOL_TOP_UP_TARGET * 2
  );

  const gasBalance = await fetchSolBalance(gasAddress);
  if (gasBalance < sendSolAmount + MIN_SOL_GAS_OPERATION) {
    throw new Error(
      `Solana gas wallet needs funding for SPL withdrawals. Send SOL to ${gasAddress}`
    );
  }

  const gasKey = getSplGasWalletPrivateKey();
  await sendSol(gasKey, toAddress, sendSolAmount);
}
