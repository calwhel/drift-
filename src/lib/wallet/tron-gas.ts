import {
  assertTronGasWalletCanSend,
  fetchTronTrxBalance,
  getTronGasWalletPrivateKey,
  getTronGasWalletRecord,
  isTronAccountActivated,
  TRX_TOP_UP_TARGET,
} from "./gas-wallet";
import { deriveDepositAddress } from "./derive";

const ACTIVATION_TRX = 1.1;

async function sendTronTrx(fromPrivateKey: string, toAddress: string, amountTrx: number): Promise<string> {
  const { TronWeb } = await import("tronweb");
  const pk = fromPrivateKey.startsWith("0x") ? fromPrivateKey.slice(2) : fromPrivateKey;
  const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST ?? "https://api.trongrid.io",
    headers: process.env.TRONGRID_API_KEY
      ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY }
      : {},
    privateKey: pk,
  });

  const sun = Math.round(amountTrx * 1e6);
  const result = await tronWeb.trx.sendTransaction(toAddress, sun);

  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const r = result as { txid?: string; transaction?: { txID?: string } };
    return r.txid ?? r.transaction?.txID ?? String(result);
  }
  return String(result);
}

/**
 * Send the minimum TRX needed for one TRC20 transfer on a deposit address.
 * Avoids sending 15+ TRX per address (previous behaviour drained the gas wallet).
 */
export async function fundTronAddressIfNeeded(toAddress: string): Promise<void> {
  const gasRecord = await getTronGasWalletRecord();
  if (gasRecord?.address && toAddress === gasRecord.address) {
    return;
  }

  const balanceTrx = await fetchTronTrxBalance(toAddress);
  if (balanceTrx >= TRX_TOP_UP_TARGET) return;

  const activated = balanceTrx > 0 || (await isTronAccountActivated(toAddress));
  let sendTrx = Math.max(TRX_TOP_UP_TARGET - balanceTrx, 0);

  if (!activated && sendTrx < ACTIVATION_TRX) {
    sendTrx = ACTIVATION_TRX;
  }

  // Cap single top-up — one TRC20 transfer does not need more than ~8 TRX
  sendTrx = Math.min(Math.max(sendTrx, 0.5), 8);

  if (sendTrx < 0.5) return;

  await assertTronGasWalletCanSend(sendTrx);

  const gasKey = getTronGasWalletPrivateKey();
  await sendTronTrx(gasKey, toAddress, sendTrx);
}

const TRX_RECLAIM_RESERVE = 1;

/** Return leftover TRX from a deposit address to the gas wallet after a USDT transfer. */
export async function reclaimTronTrxToGasWallet(
  fromPrivateKey: string,
  fromAddress: string
): Promise<void> {
  const gasRecord = await getTronGasWalletRecord();
  if (!gasRecord?.address || fromAddress === gasRecord.address) return;

  const balanceTrx = await fetchTronTrxBalance(fromAddress);
  const reclaimable = balanceTrx - TRX_RECLAIM_RESERVE;
  if (reclaimable < 0.5) return;

  try {
    await sendTronTrx(fromPrivateKey, gasRecord.address, reclaimable);
  } catch (err) {
    console.warn(`[tron-gas] TRX reclaim from ${fromAddress} failed:`, err);
  }
}

export function getTronSourceAddress(
  fromDerivationIndex: number | null,
  currency: string,
  network: string,
  walletAddress?: string | null
): string | null {
  if (fromDerivationIndex != null) {
    return deriveDepositAddress(fromDerivationIndex, currency, network);
  }
  if (walletAddress) return walletAddress;
  return null;
}
