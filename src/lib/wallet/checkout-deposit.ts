import { isMasterWalletConfigured } from "./master-wallet";
import { deriveDepositAddress, getNextDerivationIndex } from "./derive";

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
 * Unique deposit address per checkout — requires master mnemonic.
 * Shared custodial address mode is disabled (causes payment misattribution).
 */
export async function resolveCheckoutDeposit(
  currency: string,
  network: string,
  wallet: WalletRow | null
): Promise<CheckoutDeposit> {
  if (!isMasterWalletConfigured()) {
    throw new Error(
      "MASTER_WALLET_MNEMONIC is not configured. Add a valid BIP39 mnemonic in Railway to create payment links with unique deposit addresses."
    );
  }

  const derivationIndex = await getNextDerivationIndex();
  const depositAddress = deriveDepositAddress(derivationIndex, currency, network);

  return {
    depositAddress,
    derivationIndex,
    walletId: wallet?.id ?? null,
  };
}

/** Direct wallet address — used only for displaying the merchant's custodial wallet, not checkout. */
export function getCustodialWalletAddress(wallet: WalletRow): string {
  return wallet.address;
}
