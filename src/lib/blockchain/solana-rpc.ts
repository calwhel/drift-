import type { Connection } from "@solana/web3.js";

const PUBLIC_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function getSolanaRpcUrls(): string[] {
  const primary = process.env.SOLANA_RPC_URL?.trim();
  const urls = primary ? [primary, ...PUBLIC_FALLBACKS.filter((u) => u !== primary)] : PUBLIC_FALLBACKS;
  return Array.from(new Set(urls));
}

export function isSolanaRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests|Connection rate limits exceeded/i.test(msg);
}

/** Short user-facing message — never expose raw RPC JSON. */
export function formatSolanaRpcError(err: unknown): string {
  if (isSolanaRateLimitError(err)) {
    const hasCustom = Boolean(process.env.SOLANA_RPC_URL?.trim());
    return hasCustom
      ? "Solana RPC rate limited — wait a moment and refresh, or check SOLANA_RPC_URL quota."
      : "Solana RPC rate limited — set SOLANA_RPC_URL (Helius/QuickNode) in Railway env, then refresh.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/HTTP 5\d\d/i.test(msg)) return "Solana RPC temporarily unavailable — try again shortly.";
  if (msg.length > 120) return "Solana balance lookup failed — try Refresh on-chain.";
  return msg;
}

async function createConnection(rpcUrl: string): Promise<Connection> {
  const { Connection } = await import("@solana/web3.js");
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Run a Solana RPC operation with retries, fallback URLs, and backoff on 429.
 */
export async function withSolanaConnection<T>(
  fn: (connection: Connection, rpcUrl: string) => Promise<T>
): Promise<T> {
  const urls = getSolanaRpcUrls();
  let lastErr: unknown;

  for (const rpcUrl of urls) {
    const connection = await createConnection(rpcUrl);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await fn(connection, rpcUrl);
      } catch (err) {
        lastErr = err;
        if (!isSolanaRateLimitError(err) || attempt === 2) break;
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Minimum gap between Solana balance reads to avoid bursting public RPC limits. */
let lastSolanaBalanceAt = 0;
const SOLANA_BALANCE_GAP_MS = 250;

export async function throttleSolanaBalanceRead<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, SOLANA_BALANCE_GAP_MS - (now - lastSolanaBalanceAt));
  if (wait > 0) await sleep(wait);
  lastSolanaBalanceAt = Date.now();
  return fn();
}
