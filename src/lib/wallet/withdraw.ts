import { eq } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { fundTronAddressIfNeeded } from "./tron-gas";

async function refundWithdrawalBalance(withdrawal: {
  walletId: string | null;
  amount: string;
}): Promise<void> {
  if (!withdrawal.walletId) return;

  const [wallet] = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, withdrawal.walletId))
    .limit(1);

  if (!wallet) return;

  const restored = Number(wallet.balance) + Number(withdrawal.amount);
  await db
    .update(wallets)
    .set({ balance: String(restored) })
    .where(eq(wallets.id, withdrawal.walletId));
}

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
        await refundWithdrawalBalance(withdrawal);
        await db
          .update(withdrawals)
          .set({ status: "failed", error: "Invalid custodial wallet" })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const privateKey = getPrivateKeyFromWallet(wallet.encryptedPrivateKey);
      if (!privateKey) {
        await refundWithdrawalBalance(withdrawal);
        await db
          .update(withdrawals)
          .set({ status: "failed", error: "Missing wallet private key" })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const amount = Number(withdrawal.amount);

      if (withdrawal.network === "TRC20" && withdrawal.currency === "USDT") {
        await fundTronAddressIfNeeded(wallet.address);

        const onChain = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
        const available = onChain.amount ?? 0;

        if (available + 0.000001 < amount) {
          throw new Error(
            `Insufficient on-chain USDT in wallet (have ${available.toFixed(4)}, need ${amount.toFixed(4)}). ` +
              "Funds may still be sweeping from payment links — wait a few minutes and retry."
          );
        }
      }

      const txHash = await broadcastFromPrivateKey(
        privateKey,
        withdrawal.toAddress,
        amount,
        withdrawal.currency,
        withdrawal.network
      );

      await db
        .update(withdrawals)
        .set({ status: "completed", txHash, completedAt: new Date(), error: null })
        .where(eq(withdrawals.id, withdrawal.id));
      processed++;
    } catch (err) {
      await refundWithdrawalBalance(withdrawal);
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
