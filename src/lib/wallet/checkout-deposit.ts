import { deriveDepositAddress, getNextDerivationIndex } from "./derive";
import { isMasterWalletConfigured } from "./master-wallet";

type WalletRow = {
  id: string;
  address: string;
  walletType: string;
  derivationIndex?: number | null;
};

export interface CheckoutDeposit {
  depositAddress: string;
  derivationIndex: number | null;
  walletId: string | null;
}

/**
 * Unique deposit address per checkout when master wallet is configured.
 * Falls back to custodial wallet address only for generated wallets when mnemonic is missing.
 */
export async function resolveCheckoutDeposit(
  currency: string,
  network: string,
  wallet: WalletRow | null
): Promise<CheckoutDeposit> {
  if (isMasterWalletConfigured()) {
    const derivationIndex = await getNextDerivationIndex();
    const depositAddress = deriveDepositAddress(derivationIndex, currency, network);

    return {
      depositAddress,
      derivationIndex,
      walletId: wallet?.id ?? null,
    };
  }

  if (wallet?.walletType === "generated") {
    console.warn(
      "[checkout] MASTER_WALLET_MNEMONIC not configured — using custodial wallet address. Set mnemonic in Railway for unique deposit addresses per link."
    );
    return {
      depositAddress: wallet.address,
      derivationIndex: wallet.derivationIndex ?? null,
      walletId: wallet.id,
    };
  }

  throw new Error(
    "MASTER_WALLET_MNEMONIC is not configured. Add a valid BIP39 mnemonic in Railway environment variables to create payment links."
  );
}

/** Direct wallet address — used only for displaying the merchant's custodial wallet, not checkout. */
export function getCustodialWalletAddress(wallet: WalletRow): string {
  return wallet.address;
}
