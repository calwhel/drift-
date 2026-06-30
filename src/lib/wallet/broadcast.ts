import { decryptPrivateKey } from "./encryption";
import { TOKEN_CONTRACTS } from "../constants";

const USDT_ERC20 = TOKEN_CONTRACTS.ERC20.USDT;
const USDC_ERC20 = TOKEN_CONTRACTS.ERC20.USDC;
const USDT_SPL_MINT = TOKEN_CONTRACTS.SPL.USDT;

function normalizePrivateKey(privateKey: string): string {
  return privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
}

function solanaKeypairFromPrivateKey(privateKey: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Keypair } = require("@solana/web3.js") as typeof import("@solana/web3.js");
  const bytes = Buffer.from(normalizePrivateKey(privateKey), "hex");
  if (bytes.length === 64) {
    return Keypair.fromSecretKey(bytes);
  }
  return Keypair.fromSeed(bytes.slice(0, 32));
}

async function broadcastTrc20Usdt(privateKey: string, toAddress: string, amount: number): Promise<string> {
  const { TronWeb } = await import("tronweb");
  const pk = normalizePrivateKey(privateKey);
  const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST ?? "https://api.trongrid.io",
    headers: process.env.TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
      : {},
    privateKey: pk,
  });

  const contract = await tronWeb.contract().at(TOKEN_CONTRACTS.TRC20.USDT);
  const sunAmount = Math.round(amount * 1e6);
  const result = await contract.transfer(toAddress, sunAmount).send();

  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const r = result as { txid?: string; transaction?: { txID?: string } };
    return r.txid ?? r.transaction?.txID ?? String(result);
  }
  return String(result);
}

async function broadcastSplUsdt(
  privateKey: string,
  toOwnerAddress: string,
  amount: number
): Promise<string> {
  const { Connection, PublicKey, Transaction, sendAndConfirmTransaction } = await import(
    "@solana/web3.js"
  );
  const {
    getAssociatedTokenAddress,
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
  } = await import("@solana/spl-token");

  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const fromKeypair = solanaKeypairFromPrivateKey(privateKey);
  const mint = new PublicKey(USDT_SPL_MINT);
  const toOwner = new PublicKey(toOwnerAddress);

  const fromAta = await getAssociatedTokenAddress(mint, fromKeypair.publicKey);
  const toAta = await getAssociatedTokenAddress(mint, toOwner);

  const tx = new Transaction();

  try {
    await getAccount(connection, toAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        fromKeypair.publicKey,
        toAta,
        toOwner,
        mint
      )
    );
  }

  const tokenAmount = BigInt(Math.round(amount * 1e6));
  tx.add(
    createTransferInstruction(fromAta, toAta, fromKeypair.publicKey, tokenAmount)
  );

  return sendAndConfirmTransaction(connection, tx, [fromKeypair]);
}

export async function broadcastFromPrivateKey(
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  network: string
): Promise<string> {
  if (network === "TRC20" && currency === "USDT") {
    return broadcastTrc20Usdt(privateKey, toAddress, amount);
  }

  if (network === "SPL" && currency === "USDT") {
    return broadcastSplUsdt(privateKey, toAddress, amount);
  }

  if (network === "ERC20" && process.env.ETH_RPC_URL) {
    const contract =
      currency === "USDC" ? USDC_ERC20 : currency === "USDT" ? USDT_ERC20 : null;
    const decimals = currency === "ETH" ? 18 : 6;

    if (currency === "ETH") {
      const { Wallet, JsonRpcProvider, parseEther } = await import("ethers");
      const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
      const signer = new Wallet(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`, provider);
      const tx = await signer.sendTransaction({
        to: toAddress,
        value: parseEther(amount.toFixed(18)),
      });
      const receipt = await tx.wait();
      return receipt!.hash;
    }

    if (contract) {
      const { Wallet, Contract, JsonRpcProvider, parseUnits } = await import("ethers");
      const provider = new JsonRpcProvider(process.env.ETH_RPC_URL);
      const signer = new Wallet(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`, provider);
      const token = new Contract(
        contract,
        ["function transfer(address to, uint256 amount) returns (bool)"],
        signer
      );
      const tx = await token.transfer(toAddress, parseUnits(amount.toFixed(decimals), decimals));
      const receipt = await tx.wait();
      return receipt.hash as string;
    }
  }

  throw new Error(`On-chain broadcast not configured for ${currency}/${network}`);
}

export function getPrivateKeyFromWallet(encryptedPrivateKey: string | null): string | null {
  if (!encryptedPrivateKey) return null;
  return decryptPrivateKey(encryptedPrivateKey);
}
