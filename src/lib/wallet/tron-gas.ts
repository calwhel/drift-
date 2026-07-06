import {
  assertTronGasWalletReady,
  getTronGasWalletPrivateKey,
  MIN_DEPOSIT_TRX,
} from "./gas-wallet";
import { deriveDepositAddress } from "./derive";

const MIN_TRX_SUN = MIN_DEPOSIT_TRX * 1_000_000;

async function getTronTrxBalanceSun(address: string): Promise<number> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return 0;

  const data = (await res.json()) as { data?: Array<{ balance?: number }> };
  return data.data?.[0]?.balance ?? 0;
}

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

/** Top up a deposit address with TRX from the admin gas wallet */
export async function fundTronAddressIfNeeded(toAddress: string): Promise<void> {
  await assertTronGasWalletReady();

  const balance = await getTronTrxBalanceSun(toAddress);
  if (balance >= MIN_TRX_SUN) return;

  const topUpTrx = (MIN_TRX_SUN - balance) / 1e6 + 2;
  const gasKey = getTronGasWalletPrivateKey();

  await sendTronTrx(gasKey, toAddress, topUpTrx);
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
