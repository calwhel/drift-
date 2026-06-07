import { FEE_RATE, NET_RATE } from "./constants";

export function calculateFee(amount: number) {
  const feeAmount = Math.round(amount * FEE_RATE * 1e8) / 1e8;
  const netAmount = Math.round(amount * NET_RATE * 1e8) / 1e8;
  return { feeAmount, netAmount };
}
