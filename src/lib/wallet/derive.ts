import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Wallet, keccak256, getBytes, computeAddress } from "ethers";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { sha256 } from "@noble/hashes/sha2.js";
import * as bitcoin from "bitcoinjs-lib";
import { eq, sql } from "drizzle-orm";
import { db, derivationCounter } from "../db";
import { defaultNetworkForCurrency } from "../constants";
import { getMasterWalletMnemonic } from "./master-wallet";
import { MERCHANT_DERIVATION_START } from "../derivation-indices";

const EVM_PATH = (i: number) => `m/44'/60'/0'/0/${i}`;

const DERIVATION_PATHS: Record<string, (index: number) => string> = {
  ERC20: EVM_PATH,
  BEP20: EVM_PATH,
  Polygon: EVM_PATH,
  Arbitrum: EVM_PATH,
  Base: EVM_PATH,
  Avalanche: EVM_PATH,
  TRC20: (i) => `m/44'/195'/0'/0/${i}`,
  Bitcoin: (i) => `m/84'/0'/0'/0/${i}`,
  Solana: (i) => `m/44'/501'/${i}'/0'`,
  SPL: (i) => `m/44'/501'/${i}'/0'`,
};

function getMasterKey(): HDKey {
  const mnemonic = getMasterWalletMnemonic();
  if (!mnemonic) {
    throw new Error("MASTER_WALLET_MNEMONIC is not configured");
  }
  const seed = mnemonicToSeedSync(mnemonic);
  return HDKey.fromMasterSeed(seed);
}

function tronAddressFromPrivateKey(privateKeyHex: string): string {
  const wallet = new Wallet(privateKeyHex);
  const pubKey = wallet.signingKey.publicKey.slice(4);
  const hash = keccak256(getBytes("0x" + pubKey));
  const addressBytes = Buffer.concat([Buffer.from([0x41]), Buffer.from(hash.slice(-40), "hex")]);
  const checksum = sha256(sha256(addressBytes)).slice(0, 4);
  return bs58.encode(Buffer.concat([addressBytes, Buffer.from(checksum)]));
}

/** BIP84 native segwit (bc1…) — matches m/84'/0'/0'/0/n derivation path */
function bitcoinAddressFromKey(key: HDKey): string {
  if (!key.publicKey) throw new Error("Missing public key for Bitcoin derivation");
  const payment = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(key.publicKey),
    network: bitcoin.networks.bitcoin,
  });
  if (!payment.address) throw new Error("Failed to derive Bitcoin address");
  return payment.address;
}

function solanaAddressFromKey(key: HDKey): string {
  const seed = key.privateKey!.slice(0, 32);
  const keypair = Keypair.fromSeed(seed);
  return keypair.publicKey.toBase58();
}

export function deriveDepositAddress(
  derivationIndex: number,
  currency: string,
  network: string
): string {
  const net = network || defaultNetworkForCurrency(currency);
  const pathFn = DERIVATION_PATHS[net];
  if (!pathFn) {
    throw new Error(`Unsupported network for derivation: ${net}`);
  }

  const master = getMasterKey();
  const child = master.derive(pathFn(derivationIndex));
  if (!child.privateKey) {
    throw new Error("Failed to derive private key");
  }

  const privateKeyHex = Buffer.from(child.privateKey).toString("hex");

  if (net === "TRC20") {
    return tronAddressFromPrivateKey(privateKeyHex);
  }
  if (net === "Bitcoin") {
    return bitcoinAddressFromKey(child);
  }
  if (net === "Solana" || net === "SPL") {
    return solanaAddressFromKey(child);
  }
  return computeAddress("0x" + privateKeyHex);
}

export function derivePrivateKey(derivationIndex: number, network: string): string {
  const pathFn = DERIVATION_PATHS[network];
  if (!pathFn) throw new Error(`Unsupported network: ${network}`);

  const master = getMasterKey();
  const child = master.derive(pathFn(derivationIndex));
  if (!child.privateKey) throw new Error("Failed to derive private key");
  return "0x" + Buffer.from(child.privateKey).toString("hex");
}

export async function getNextDerivationIndex(): Promise<number> {
  // nextIndex is always one past the index being allocated; start at 2 so first merchant gets index 1 (index 0 = TRON gas)
  await db
    .insert(derivationCounter)
    .values({ id: 1, nextIndex: MERCHANT_DERIVATION_START + 1 })
    .onConflictDoNothing();

  const [row] = await db
    .update(derivationCounter)
    .set({ nextIndex: sql`GREATEST(${derivationCounter.nextIndex}, ${MERCHANT_DERIVATION_START + 1}) + 1` })
    .where(eq(derivationCounter.id, 1))
    .returning({ nextIndex: derivationCounter.nextIndex });

  const allocated = (row?.nextIndex ?? MERCHANT_DERIVATION_START + 1) - 1;
  return Math.max(allocated, MERCHANT_DERIVATION_START);
}
