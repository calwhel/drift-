import { sql } from "drizzle-orm";
import { db } from "./db";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** In-memory fallback when DB rate-limit table is unavailable */
function rateLimitMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

/** Cluster-safe rate limiting via Postgres (falls back to in-memory). */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const result = await db.execute(sql`
      INSERT INTO rate_limit_buckets (bucket_key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSec})
          THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        window_start = CASE
          WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSec})
          THEN now()
          ELSE rate_limit_buckets.window_start
        END
      RETURNING count
    `);

    const rows = Array.isArray(result)
      ? result
      : (((result as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? []));
    const count = Number(rows[0]?.count ?? 1);
    const allowed = count <= limit;
    return { allowed, remaining: Math.max(limit - count, 0) };
  } catch {
    return rateLimitMemory(key, limit, windowMs);
  }
}
