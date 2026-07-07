import { sql } from "drizzle-orm";
import { db } from "./db";

/** Postgres advisory lock key for the payment poller (single instance per cluster). */
const POLLER_LOCK_KEY = 839271;

function readLockAcquired(result: unknown): boolean {
  if (Array.isArray(result)) {
    const row = result[0] as { acquired?: boolean } | undefined;
    return row?.acquired === true;
  }
  const rows = (result as { rows?: Array<{ acquired?: boolean }> }).rows;
  if (Array.isArray(rows) && rows[0]) {
    return rows[0].acquired === true;
  }
  return false;
}

export async function tryAcquirePollerLock(): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT pg_try_advisory_lock(${POLLER_LOCK_KEY}) AS acquired`
  );
  return readLockAcquired(result);
}

export async function releasePollerLock(): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_unlock(${POLLER_LOCK_KEY})`);
}
