import { mnemonicToSeedSync } from "@scure/bip39";

export function getMasterWalletMnemonic(): string | null {
  const mnemonic = process.env.MASTER_WALLET_MNEMONIC?.trim();
  return mnemonic || null;
}

export function isMasterWalletConfigured(): boolean {
  const mnemonic = getMasterWalletMnemonic();
  if (!mnemonic) return false;

  const words = mnemonic.split(/\s+/).filter(Boolean);
  if (words.length < 12) return false;

  try {
    mnemonicToSeedSync(mnemonic);
    return true;
  } catch {
    return false;
  }
}

export function requireMasterWalletConfigured(): void {
  if (!isMasterWalletConfigured()) {
    throw new Error(
      "MASTER_WALLET_MNEMONIC is not configured or invalid. Add a valid BIP39 mnemonic in Railway environment variables."
    );
  }
}
