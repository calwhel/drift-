/** Reserved TRON gas wallet — never allocate to merchant deposit addresses */
export const TRON_GAS_DERIVATION_INDEX = 0;

/** First HD index used for merchant checkout deposit addresses */
export const MERCHANT_DERIVATION_START = 1;

/** Indices reserved for platform gas wallets (must not be used for checkouts) */
export const RESERVED_DERIVATION_INDICES = new Set([
  TRON_GAS_DERIVATION_INDEX,
  200, // BEP20 gas
  201, // Polygon gas
  202, // Arbitrum gas
  203, // Base gas
  204, // Avalanche gas
  205, // SPL gas
]);

export function isReservedDerivationIndex(index: number): boolean {
  return RESERVED_DERIVATION_INDICES.has(index);
}
