const TRONGRID_BASE = process.env.TRON_FULL_HOST ?? "https://api.trongrid.io";

const MIN_REQUEST_GAP_MS = 120;
let lastTronGridRequestAt = 0;

function tronHeaders(): Record<string, string> {
  const apiKey = process.env.TRONGRID_API_KEY;
  return apiKey ? { "TRON-PRO-API-KEY": apiKey } : {};
}

async function throttleTronGrid(): Promise<void> {
  const now = Date.now();
  const wait = MIN_REQUEST_GAP_MS - (now - lastTronGridRequestAt);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastTronGridRequestAt = Date.now();
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

export async function tronGridFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("http") ? path : `${TRONGRID_BASE}${path}`;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await throttleTronGrid();
    const res = await fetch(url, {
      ...init,
      headers: { ...tronHeaders(), ...(init?.headers ?? {}) },
      cache: "no-store",
    });

    if (res.ok || !isRetryableStatus(res.status) || attempt === maxAttempts) {
      return res;
    }

    const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 15000);
    console.warn(`[trongrid] HTTP ${res.status} on ${path} — retry ${attempt}/${maxAttempts} in ${backoffMs}ms`);
    await new Promise((r) => setTimeout(r, backoffMs));
  }

  throw new Error("TronGrid request failed after retries");
}

export interface TronAccountData {
  balance?: number;
  trc20?: Array<Record<string, string>>;
}

export async function fetchTronAccount(address: string): Promise<TronAccountData | undefined> {
  const res = await tronGridFetch(`/v1/accounts/${address}`);
  if (!res.ok) {
    throw new Error(`TronGrid HTTP ${res.status}`);
  }
  const body = (await res.json()) as { data?: TronAccountData[] };
  return body.data?.[0];
}

export function parseTrc20BalanceFromAccount(
  account: TronAccountData | undefined,
  contract: string
): number {
  for (const entry of account?.trc20 ?? []) {
    for (const [token, value] of Object.entries(entry)) {
      if (token === contract) {
        return Number(value) / 1e6;
      }
    }
  }
  return 0;
}

export function isTronRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests/i.test(msg);
}
