#!/usr/bin/env node
/**
 * Generates a new 12-word phrase for MASTER_WALLET_MNEMONIC.
 * Run: npm run wallet:mnemonic
 *
 * Copy the output into Railway → Variables → MASTER_WALLET_MNEMONIC
 * Store the phrase safely — Drift uses it for payment link deposit addresses.
 */
const { Wallet } = require("ethers");

const wallet = Wallet.createRandom();
const phrase = wallet.mnemonic?.phrase;

if (!phrase) {
  console.error("Failed to generate mnemonic");
  process.exit(1);
}

console.log("\n=== Drift MASTER_WALLET_MNEMONIC ===\n");
console.log(phrase);
console.log("\n1. Copy the line above (12 words)");
console.log("2. Railway → Drift app → Variables");
console.log("3. Name: MASTER_WALLET_MNEMONIC");
console.log("4. Paste as value → Save → Redeploy");
console.log("\nDo NOT use your personal wallet phrase. Keep these words private.\n");
