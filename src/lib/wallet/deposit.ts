import { deriveDepositAddress, getNextDerivationIndex } from "./derive";
import { getHoldingAddress } from "../constants";

export interface AllocatedDepositAddress {
  depositAddress: string;
  derivationIndex: number | null;
}

/** Unique deposit address per payment link / invoice (HD-derived when mnemonic is configured). */
export async function allocateDepositAddress(
  currency: string,
  network: string
): Promise<AllocatedDepositAddress> {
  const derivationIndex = await getNextDerivationIndex();

  try {
    return {
      depositAddress: deriveDepositAddress(derivationIndex, currency, network),
      derivationIndex,
    };
  } catch {
    return {
      depositAddress: getHoldingAddress(currency, network),
      derivationIndex: null,
    };
  }
}

export function paymentAmountStatus(
  received: number,
  expected: number
): "confirming" | "underpaid" | "overpaid" {
  if (received <= 0) return "confirming";
  const tolerance = expected * 0.01;
  if (received < expected - tolerance) return "underpaid";
  if (received > expected + tolerance) return "overpaid";
  return "confirming";
}

export function shouldAutoCompletePayment(status: string): boolean {
  return status === "confirming" || status === "overpaid" || status === "underpaid";
}
