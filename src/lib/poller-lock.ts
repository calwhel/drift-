import { sql } from "drizzle-orm";
import { db } from "./db";
import { randomBytes } from "crypto";

const LEASE_DURATION_MS = 120_000;
const HOLDER_ID = `drift-${process.env.RAILWAY_REPLICA_ID ?? process.pid}-${randomBytes(4).toString("hex")}`;

function readRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: Array<Record<string, unknown>> }).rows;
  return Array.isArray(rows) ? rows : [];
}

/** Acquire a cluster-wide poll lease (persists across Neon HTTP queries). */
export async function tryAcquirePollerLock(): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO poller_lease (id, holder_id, locked_until, updated_at)
    VALUES (1, ${HOLDER_ID}, now() + interval '2 minutes', now())
    ON CONFLICT (id) DO UPDATE SET
      holder_id = EXCLUDED.holder_id,
      locked_until = EXCLUDED.locked_until,
      updated_at = now()
    WHERE poller_lease.locked_until IS NULL OR poller_lease.locked_until < now()
    RETURNING holder_id
  `);

  const rows = readRows(result);
  return rows[0]?.holder_id === HOLDER_ID;
}

export async function releasePollerLock(): Promise<void> {
  await db.execute(sql`
    UPDATE poller_lease
    SET locked_until = now(), updated_at = now()
    WHERE id = 1 AND holder_id = ${HOLDER_ID}
  `);
}

export async function extendPollerLock(): Promise<void> {
  await db.execute(sql`
    UPDATE poller_lease
    SET locked_until = now() + interval '2 minutes', updated_at = now()
    WHERE id = 1 AND holder_id = ${HOLDER_ID}
  `);
}

export { LEASE_DURATION_MS };
