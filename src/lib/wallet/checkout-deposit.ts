import { deriveDepositAddress, getNextDerivationIndex } from "./derive";

type WalletRow = {
  id: string;
  address: string;
  walletType: string;
};

export interface CheckoutDeposit {
  depositAddress: string;
  derivationIndex: number | null;
  walletId: string | null;
}

/**
 * Unique deposit address per checkout (payment link, invoice, subscription).
 * Prevents old transfers on a shared custodial wallet from matching a new link.
 */
export async function resolveCheckoutDeposit(
  currency: string,
  network: string,
  wallet: WalletRow | null
): Promise<CheckoutDeposit> {
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
