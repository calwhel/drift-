import { tronGridFetch } from "../blockchain/trongrid";
import { isEvmUsdtNetwork } from "../evm/chains";

const TRON_TX_RE = /^[a-f0-9]{64}$/;
const EVM_TX_RE = /^0x[a-fA-F0-9]{64}$/;
const SOL_TX_RE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function normalizeTronTxId(raw: string): string {
  const h = raw.trim().toLowerCase();
  if (!TRON_TX_RE.test(h)) {
    throw new Error(`Invalid Tron transaction id: ${raw}`);
  }
  return h;
}

export function extractTronTxId(result: unknown): string {
  if (typeof result === "string") {
    return normalizeTronTxId(result);
  }

  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const tx = r.transaction as Record<string, unknown> | undefined;
    const candidates = [r.txid, r.txID, tx?.txID, tx?.txid];

    for (const c of candidates) {
      if (typeof c === "string") {
        try {
          return normalizeTronTxId(c);
        } catch {
          // try next candidate
        }
      }
    }
  }

  throw new Error(
    `TRC20 transfer did not return a valid transaction id (got ${JSON.stringify(result)})`
  );
}

export function isValidTxHashForNetwork(
  txHash: string,
  currency: string,
  network: string
): boolean {
  const h = txHash.trim();
  if (!h || h === "true" || h === "[object Object]") return false;

  if (network === "TRC20") {
    return TRON_TX_RE.test(h.toLowerCase());
  }
  if (isEvmUsdtNetwork(network) || network === "ERC20") {
    return EVM_TX_RE.test(h);
  }
  if (network === "SPL" || network === "Solana") {
    return SOL_TX_RE.test(h);
  }
  if (network === "Bitcoin" && currency === "BTC") {
    return /^[a-fA-F0-9]{64}$/.test(h);
  }
  return h.length >= 8;
}

export function parseWithdrawalTxHashes(
  txHash: string,
  currency: string,
  network: string
): string[] {
  const parts = txHash
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Withdrawal produced no on-chain transaction");
  }

  for (const part of parts) {
    if (!isValidTxHashForNetwork(part, currency, network)) {
      throw new Error(`Invalid on-chain transaction id: ${part}`);
    }
  }

  return parts;
}

export async function verifyTronTransactionSuccess(
  txHash: string,
  timeoutMs = 90_000
): Promise<void> {
  const id = normalizeTronTxId(txHash);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const res = await tronGridFetch("/wallet/gettransactioninfobyid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: id }),
    });

    if (!res.ok) {
      throw new Error(`TronGrid verify HTTP ${res.status}`);
    }

    const info = (await res.json()) as {
      id?: string;
      receipt?: { result?: string };
    };

    if (info.id && info.receipt?.result) {
      if (info.receipt.result === "SUCCESS") return;
      throw new Error(`Tron transaction failed on-chain: ${info.receipt.result}`);
    }

    await sleep(3000);
  }

  throw new Error("Tron transaction was not confirmed on-chain in time");
}

export async function verifyWithdrawalTransactions(
  txHash: string,
  currency: string,
  network: string
): Promise<void> {
  const hashes = parseWithdrawalTxHashes(txHash, currency, network);

  if (network === "TRC20" && currency === "USDT") {
    for (const hash of hashes) {
      await verifyTronTransactionSuccess(hash);
    }
    return;
  }

  if (isEvmUsdtNetwork(network) && currency === "USDT") {
    // EVM receipts are checked at broadcast time (tx.wait + status)
    return;
  }

  if (network === "SPL" && currency === "USDT") {
    // sendAndConfirmTransaction already confirms
    return;
  }
}

export function assertPositiveNetAmount(netAmount: number): void {
  if (netAmount < 0.01) {
    throw new Error("Withdrawal net amount is too small to send on-chain");
  }
}
