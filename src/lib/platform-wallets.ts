import { and, eq } from "drizzle-orm";
import { db, platformWallets } from "./db";

export { PLATFORM_WALLET_NETWORKS } from "./constants";

export async function getPlatformFeeAddress(
  currency: string,
  network: string
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(platformWallets)
    .where(
      and(
        eq(platformWallets.currency, currency),
        eq(platformWallets.network, network),
        eq(platformWallets.isActive, true)
      )
    )
    .limit(1);

  if (row) return row.address;

  const envKey = `HOLDING_WALLET_${currency}_${network}`.replace(/ /g, "_");
  if (process.env[envKey]) return process.env[envKey]!;

  return process.env.PLATFORM_FEE_WALLET ?? process.env.DEFAULT_HOLDING_WALLET ?? null;
}
