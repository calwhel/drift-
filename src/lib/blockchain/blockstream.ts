const BLOCKSTREAM_API = "https://blockstream.info/api";
const FETCH_TIMEOUT_MS = 10_000;
const ERROR_LOG_INTERVAL_MS = 60 * 60 * 1000;

let lastErrorLogAt = 0;
let lastErrorKey = "";

export interface BlockstreamTxVout {
  scriptpubkey_address?: string;
  value: number;
}

export interface BlockstreamTx {
  txid: string;
  vout: BlockstreamTxVout[];
  status: { confirmed: boolean; block_height?: number };
}

/** Log BTC/Blockstream errors at most once per hour per unique message. */
export function logBlockstreamError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const key = `${context}:${message}`;
  const now = Date.now();

  if (key === lastErrorKey && now - lastErrorLogAt < ERROR_LOG_INTERVAL_MS) {
    return;
  }

  lastErrorKey = key;
  lastErrorLogAt = now;
  console.warn(
    `[btc-poller] ${context}: ${message} (further identical errors suppressed for 1h)`
  );
}

export async function blockstreamFetch(path: string): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${BLOCKSTREAM_API}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

export async function fetchBlockstreamAddressTxIds(address: string): Promise<string[]> {
  const res = await blockstreamFetch(`/address/${encodeURIComponent(address)}/txs`);
  if (!res.ok) {
    throw new Error(`address txs HTTP ${res.status}`);
  }

  const txs = (await res.json()) as Array<{ txid?: string }>;
  return (txs ?? []).map((t) => t.txid).filter((id): id is string => Boolean(id));
}

export async function fetchBlockstreamTx(txid: string): Promise<BlockstreamTx> {
  const res = await blockstreamFetch(`/tx/${encodeURIComponent(txid)}`);
  if (!res.ok) {
    throw new Error(`tx ${txid} HTTP ${res.status}`);
  }
  return res.json() as Promise<BlockstreamTx>;
}

export async function fetchBlockstreamTipHeight(): Promise<number> {
  const res = await blockstreamFetch("/blocks/tip/height");
  if (!res.ok) {
    throw new Error(`tip height HTTP ${res.status}`);
  }
  const text = await res.text();
  const height = Number(text);
  if (!Number.isFinite(height)) {
    throw new Error(`invalid tip height: ${text}`);
  }
  return height;
}
