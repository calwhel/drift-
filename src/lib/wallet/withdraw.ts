import { eq } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";

export async function processPendingWithdrawals(): Promise<number> {
  const pending = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.status, "pending"));

  let processed = 0;

  for (const withdrawal of pending) {
    try {
      if (!withdrawal.walletId) {
        await db
          .update(withdrawals)
          .set({
            status: "completed",
            completedAt: new Date(),
            error: "Ledger withdrawal (connected wallet)",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        processed++;
        continue;
      }

      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, withdrawal.walletId))
        .limit(1);

      if (!wallet || wallet.walletType !== "generated") {
        await db
          .update(withdrawals)
          .set({ status: "failed", error: "Invalid custodial wallet" })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const privateKey = getPrivateKeyFromWallet(wallet.encryptedPrivateKey);
      if (!privateKey) {
        await db
          .update(withdrawals)
          .set({ status: "failed", error: "Missing wallet private key" })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const txHash = await broadcastFromPrivateKey(
        privateKey,
        withdrawal.toAddress,
        Number(withdrawal.amount),
        withdrawal.currency,
        withdrawal.network
      );

      await db
        .update(withdrawals)
        .set({ status: "completed", txHash, completedAt: new Date() })
        .where(eq(withdrawals.id, withdrawal.id));
      processed++;
    } catch (err) {
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : "Withdrawal broadcast failed",
        })
        .where(eq(withdrawals.id, withdrawal.id));
    }
  }

  return processed;
}
