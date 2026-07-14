import { Wallet, keccak256, getBytes, computeAddress } from "ethers";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { sha256 } from "@noble/hashes/sha2.js";
import * as bitcoin from "bitcoinjs-lib";
import { isEvmAddressNetwork } from "../evm/chains";
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ecc = require("tiny-secp256k1");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ECPairFactory } = require("ecpair");
  const ECPair = ECPairFactory(ecc);
  const keyPair = ECPair.fromPrivateKey(Buffer.from(hex, "hex"), { network: bitcoin.networks.bitcoin });
  const payment = bitcoin.payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  if (!payment.address) throw new Error("Failed to derive Bitcoin address");
  return payment.address;
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
  } else if (isEvmAddressNetwork(network)) {
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
  if (isEvmAddressNetwork(network) || network === "ERC20") {
    return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  }
  if (network === "TRC20") return /^T[a-zA-Z0-9]{33}$/.test(trimmed);
  if (network === "Bitcoin") {
    try {
      bitcoin.address.toOutputScript(trimmed, bitcoin.networks.bitcoin);
      return true;
    } catch {
      return false;
    }
  }
  if (network === "Solana" || network === "SPL") {
    try {
      new PublicKey(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}
