import {
  fetchTronTrxBalance,
  getTronGasWalletPrivateKey,
  getTronGasWalletRecord,
  getTronGasWalletStatus,
  isTronAccountActivated,
  MIN_GAS_TRX_OPERATION,
  MIN_TRX_FOR_TRC20_TRANSFER,
  TRX_TOP_UP_TARGET,
} from "./gas-wallet";
import { deriveDepositAddress } from "./derive";
import { isTronRateLimitError } from "../blockchain/trongrid";

const ACTIVATION_TRX = 1.1;

export function isTronGasWalletError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /gas wallet needs more TRX|Tron gas wallet/i.test(msg);
}

function gasWalletShortfallError(balance: number, needed: number, address: string): Error {
  return new Error(
    `Tron gas wallet needs more TRX (has ${balance.toFixed(2)}, need ~${needed.toFixed(1)} for this transfer). Send TRX to ${address}.`
  );
}

async function sendTronTrx(fromPrivateKey: string, toAddress: string, amountTrx: number): Promise<string> {
  const { TronWeb } = await import("tronweb");
  const pk = fromPrivateKey.startsWith("0x") ? fromPrivateKey.slice(2) : fromPrivateKey;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
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
    } catch (err) {
      if (!isTronRateLimitError(err) || attempt === maxAttempts) throw err;
      const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 15000);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw new Error("TRX send failed after retries");
}

/**
 * Send the minimum TRX needed for one TRC20 transfer on a deposit address.
 * Uses partial top-ups when the gas wallet is low instead of failing outright.
 */
export async function fundTronAddressIfNeeded(toAddress: string): Promise<void> {
  const gasRecord = await getTronGasWalletRecord();
  if (gasRecord?.address && toAddress === gasRecord.address) {
    return;
  }

  const balanceTrx = await fetchTronTrxBalance(toAddress);
  if (balanceTrx >= TRX_TOP_UP_TARGET) return;

  const activated = balanceTrx > 0 || (await isTronAccountActivated(toAddress));
  let idealSend = Math.max(TRX_TOP_UP_TARGET - balanceTrx, 0);

  if (!activated && idealSend < ACTIVATION_TRX) {
    idealSend = ACTIVATION_TRX;
  }

  idealSend = Math.min(Math.max(idealSend, 0.5), 8);

  if (idealSend < 0.5) {
    if (balanceTrx >= MIN_TRX_FOR_TRC20_TRANSFER) return;
    return;
  }

  const gasStatus = await getTronGasWalletStatus();
  if (!gasStatus.configured || !gasStatus.address) {
    throw new Error(gasStatus.message || "Tron gas wallet is not configured");
  }
  if (!gasStatus.accountExists) {
    throw new Error(
      `Tron gas wallet ${gasStatus.address} is not activated. Send TRX to this address in Admin → Platform Wallets.`
    );
  }

  const maxAffordable = Math.max(gasStatus.trxBalance - MIN_GAS_TRX_OPERATION, 0);
  const sendTrx = Math.min(idealSend, maxAffordable);

  if (sendTrx < 0.5) {
    if (balanceTrx >= MIN_TRX_FOR_TRC20_TRANSFER) return;
    throw gasWalletShortfallError(gasStatus.trxBalance, idealSend + MIN_GAS_TRX_OPERATION, gasStatus.address);
  }

  if (sendTrx < idealSend && balanceTrx + sendTrx < MIN_TRX_FOR_TRC20_TRANSFER) {
    throw gasWalletShortfallError(
      gasStatus.trxBalance,
      idealSend + MIN_GAS_TRX_OPERATION,
      gasStatus.address
    );
  }

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
