import { Wallet, keccak256, getBytes, computeAddress } from "ethers";
import { Keypair } from "@solana/web3.js";
import { HDKey } from "@scure/bip32";
import bs58 from "bs58";
import { sha256 } from "@noble/hashes/sha2.js";
import { encryptPrivateKey } from "./encryption";

function tronAddressFromPrivateKey(privateKeyHex: string): string {
  const hex = privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`;
  const wallet = new Wallet(hex);
  const pubKey = wallet.signingKey.publicKey.slice(4);
  const hash = keccak256(getBytes("0x" + pubKey));
  const addressBytes = Buffer.concat([Buffer.from([0x41]), Buffer.from(hash.slice(-40), "hex")]);
  const checksum = sha256(sha256(addressBytes)).slice(0, 4);
  return bs58.encode(Buffer.concat([addressBytes, Buffer.from(checksum)]));
}

function bitcoinAddressFromPrivateKey(privateKeyHex: string): string {
  const hex = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const key = HDKey.fromMasterSeed(Buffer.from(hex, "hex"));
  const pubkey = key.publicKey!;
  const hash = sha256(pubkey);
  const version = 0x00;
  const payload = Buffer.concat([Buffer.from([version]), Buffer.from(hash)]);
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return bs58.encode(Buffer.concat([payload, Buffer.from(checksum)]));
}

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  encryptedPrivateKey: string;
}

export function generateWalletForNetwork(currency: string, network: string): GeneratedWallet {
  const ethWallet = Wallet.createRandom();
  let address: string;
  let privateKey: string;

  if (network === "TRC20") {
    privateKey = ethWallet.privateKey;
    address = tronAddressFromPrivateKey(privateKey);
  } else if (network === "Bitcoin") {
    privateKey = ethWallet.privateKey;
    address = bitcoinAddressFromPrivateKey(privateKey.slice(2));
  } else if (network === "Solana" || network === "SPL") {
    const keypair = Keypair.generate();
    privateKey = Buffer.from(keypair.secretKey).toString("hex");
    address = keypair.publicKey.toBase58();
  } else if (network === "ERC20") {
    privateKey = ethWallet.privateKey;
    address = computeAddress(privateKey);
  } else {
    throw new Error(`Unsupported network: ${network} for ${currency}`);
  }

  return {
    address,
    privateKey,
    encryptedPrivateKey: encryptPrivateKey(privateKey),
  };
}

export function validateWalletAddress(address: string, network: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 10) return false;
  if (network === "ERC20") return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  if (network === "TRC20") return /^T[a-zA-Z0-9]{33}$/.test(trimmed);
  if (network === "Bitcoin") return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(trimmed);
  if (network === "Solana" || network === "SPL") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
  return true;
}
