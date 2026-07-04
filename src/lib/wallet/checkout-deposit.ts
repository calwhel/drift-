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

/** Resolve where checkout funds should be sent. Connected wallets use a unique derived address so fees can be swept on-chain. */
export async function resolveCheckoutDeposit(
  currency: string,
  network: string,
  wallet: WalletRow | null
): Promise<CheckoutDeposit> {
  if (wallet?.walletType === "generated") {
    return {
      depositAddress: wallet.address,
      derivationIndex: null,
      walletId: wallet.id,
    };
  }

  const derivationIndex = await getNextDerivationIndex();
  const depositAddress = deriveDepositAddress(derivationIndex, currency, network);

  return {
    depositAddress,
    derivationIndex,
    walletId: wallet?.id ?? null,
  };
}
