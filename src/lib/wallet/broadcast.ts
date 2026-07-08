import { decryptPrivateKey } from "./encryption";
import { getTokenContract } from "../constants";
import { Wallet, Contract, parseUnits } from "ethers";
import { getEvmChain, getEvmTokenContract, getEvmTokenDecimals, isEvmUsdtNetwork } from "../evm/chains";
import { withEvmRpc } from "../evm/rpc";
import { extractTronTxId } from "./tx-verify";

const USDT_ERC20 = getTokenContract("USDT", "ERC20")!;
const USDC_ERC20 = getTokenContract("USDC", "ERC20")!;

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

async function broadcastTrc20Token(
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string
): Promise<string> {
  const tokenContract = getTokenContract(currency, "TRC20");
  if (!tokenContract) throw new Error(`Unsupported TRC20 token: ${currency}`);

  const { TronWeb } = await import("tronweb");
  const { isTronRateLimitError } = await import("../blockchain/trongrid");
  const pk = normalizePrivateKey(privateKey);
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tronWeb = new TronWeb({
        fullHost: process.env.TRON_FULL_HOST ?? "https://api.trongrid.io",
        headers: process.env.TRONGRID_API_KEY
          ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
          : {},
        privateKey: pk,
      });

      const contract = await tronWeb.contract().at(tokenContract);
      const sunAmount = Math.round(amount * 1e6);
      const result = await contract.transfer(toAddress, sunAmount).send({
        feeLimit: 100_000_000,
      });

      return extractTronTxId(result);
    } catch (err) {
      if (!isTronRateLimitError(err) || attempt === maxAttempts) throw err;
      const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 15000);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw new Error("TRC20 broadcast failed after retries");
}

async function broadcastSplToken(
  privateKey: string,
  toOwnerAddress: string,
  amount: number,
  currency: string
): Promise<string> {
  const mintAddress = getTokenContract(currency, "SPL");
  if (!mintAddress) throw new Error(`Unsupported SPL token: ${currency}`);

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
  const mint = new PublicKey(mintAddress);
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

async function broadcastSolanaNative(
  privateKey: string,
  toAddress: string,
  amount: number
): Promise<string> {
  const { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
    await import("@solana/web3.js");

  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const fromKeypair = solanaKeypairFromPrivateKey(privateKey);
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.round(amount * 1e9);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    })
  );

  return sendAndConfirmTransaction(connection, tx, [fromKeypair]);
}

async function broadcastBitcoin(
  privateKey: string,
  toAddress: string,
  amountBtc: number
): Promise<string> {
  const bitcoin = await import("bitcoinjs-lib");
  const { ECPairFactory } = await import("ecpair");
  const ecc = await import("tiny-secp256k1");

  const ECPair = ECPairFactory(ecc as Parameters<typeof ECPairFactory>[0]);
  const network = bitcoin.networks.bitcoin;
  const pkHex = normalizePrivateKey(privateKey);
  const keyPair = ECPair.fromPrivateKey(Buffer.from(pkHex, "hex"), { network });
  const fromAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address;
  if (!fromAddress) throw new Error("Failed to derive Bitcoin address");

  const utxoRes = await fetch(`https://blockstream.info/api/address/${fromAddress}/utxo`);
  if (!utxoRes.ok) throw new Error("Failed to fetch Bitcoin UTXOs");
  const utxos = (await utxoRes.json()) as Array<{
    txid: string;
    vout: number;
    value: number;
  }>;
  if (utxos.length === 0) throw new Error("No Bitcoin UTXOs available");

  const amountSats = Math.round(amountBtc * 1e8);
  const feeSats = 2500;
  let gathered = 0;
  const inputs: typeof utxos = [];

  for (const utxo of utxos) {
    inputs.push(utxo);
    gathered += utxo.value;
    if (gathered >= amountSats + feeSats) break;
  }

  if (gathered < amountSats + feeSats) {
    throw new Error("Insufficient Bitcoin balance for transfer and fees");
  }

  const psbt = new bitcoin.Psbt({ network });

  for (const utxo of inputs) {
    const txRes = await fetch(`https://blockstream.info/api/tx/${utxo.txid}/hex`);
    if (!txRes.ok) throw new Error("Failed to fetch Bitcoin transaction hex");
    const txHex = await txRes.text();
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(txHex, "hex"),
    });
  }

  psbt.addOutput({ address: toAddress, value: BigInt(amountSats) });
  const change = gathered - amountSats - feeSats;
  if (change > 546) {
    psbt.addOutput({ address: fromAddress, value: BigInt(change) });
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const rawTx = psbt.extractTransaction().toHex();

  const broadcastRes = await fetch("https://blockstream.info/api/tx", {
    method: "POST",
    body: rawTx,
  });
  if (!broadcastRes.ok) {
    const errText = await broadcastRes.text();
    throw new Error(errText || "Bitcoin broadcast failed");
  }

  return broadcastRes.text();
}

async function broadcastEvmToken(
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  network: string
): Promise<string> {
  const chain = getEvmChain(network);
  if (!chain) throw new Error(`Unsupported EVM network: ${network}`);

  const tokenContract = getEvmTokenContract(chain, currency);
  const tokenDecimals = getEvmTokenDecimals(chain, currency);
  if (!tokenContract || tokenDecimals == null) {
    throw new Error(`Token ${currency} not supported on ${network}`);
  }

  return withEvmRpc(chain, async (provider) => {
    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    const signer = new Wallet(pk, provider);
    const token = new Contract(
      tokenContract,
      ["function transfer(address to, uint256 amount) returns (bool)"],
      signer
    );
    const tx = await token.transfer(
      toAddress,
      parseUnits(amount.toFixed(tokenDecimals), tokenDecimals)
    );
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new Error(`EVM ${currency} transfer reverted on-chain`);
    }
    return receipt.hash as string;
  });
}

export async function broadcastFromPrivateKey(
  privateKey: string,
  toAddress: string,
  amount: number,
  currency: string,
  network: string
): Promise<string> {
  if (network === "TRC20" && (currency === "USDT" || currency === "USDC")) {
    return broadcastTrc20Token(privateKey, toAddress, amount, currency);
  }

  if (network === "SPL" && (currency === "USDT" || currency === "USDC")) {
    return broadcastSplToken(privateKey, toAddress, amount, currency);
  }

  if (network === "Solana" && currency === "SOL") {
    return broadcastSolanaNative(privateKey, toAddress, amount);
  }

  if (network === "Bitcoin" && currency === "BTC") {
    return broadcastBitcoin(privateKey, toAddress, amount);
  }

  if (isEvmUsdtNetwork(network) && (currency === "USDT" || currency === "USDC")) {
    return broadcastEvmToken(privateKey, toAddress, amount, currency, network);
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
