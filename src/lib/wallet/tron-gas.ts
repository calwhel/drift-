import { deriveDepositAddress, derivePrivateKey } from "./derive";

const MIN_TRX_SUN = 15_000_000; // 15 TRX — enough for several TRC20 transfers

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

/** Top up a deposit address with TRX so TRC20 token transfers can pay energy/bandwidth. */
export async function fundTronAddressIfNeeded(toAddress: string): Promise<void> {
  const balance = await getTronTrxBalanceSun(toAddress);
  if (balance >= MIN_TRX_SUN) return;

  const topUpTrx = (MIN_TRX_SUN - balance) / 1e6 + 2; // +2 TRX buffer
  const gasIndex = Number(process.env.TRON_GAS_DERIVATION_INDEX ?? 0);
  const gasKey = derivePrivateKey(gasIndex, "TRC20");

  await sendTronTrx(gasKey, toAddress, topUpTrx);
}

export function getTronSourceAddress(
  fromDerivationIndex: number | null,
  currency: string,
  network: string,
  walletAddress?: string | null
): string | null {
  if (walletAddress) return walletAddress;
  if (fromDerivationIndex != null) {
    return deriveDepositAddress(fromDerivationIndex, currency, network);
  }
  return null;
}
