import { eq } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";
import { findTrc20DepositSourcesWithBalance } from "./tron-deposits";
import { fundTronAddressIfNeeded, reclaimTronTrxToGasWallet } from "./tron-gas";

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

async function broadcastTrc20UsdtWithdrawal(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  await fundTronAddressIfNeeded(fromAddress);
  const txHash = await broadcastFromPrivateKey(
    privateKey,
    toAddress,
    amount,
    "USDT",
    "TRC20"
  );
  await reclaimTronTrxToGasWallet(privateKey, fromAddress);
  return txHash;
}

async function processTrc20UsdtWithdrawal(
  withdrawal: { toAddress: string; amount: string },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const amount = Number(withdrawal.amount);
  let remaining = amount;
  const txHashes: string[] = [];

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  if (custodialBalance > 0.000001) {
    const sendAmount = Math.min(custodialBalance, remaining);
    const hash = await broadcastTrc20UsdtWithdrawal(
      privateKey,
      wallet.address,
      withdrawal.toAddress,
      sendAmount
    );
    txHashes.push(hash);
    remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
  }

  if (remaining > 0.000001) {
    const depositSources = await findTrc20DepositSourcesWithBalance(
      wallet.userId,
      wallet.id
    );
    const depositTotal = depositSources.reduce((sum, s) => sum + s.balance, 0);

    if (custodialBalance + depositTotal + 0.000001 < amount) {
      throw new Error(
        `Insufficient on-chain USDT (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${amount.toFixed(4)}). ` +
          "Funds may still be confirming — wait a few minutes and retry."
      );
    }

    for (const source of depositSources) {
      if (remaining <= 0.000001) break;

      const sendAmount = Math.min(source.balance, remaining);
      const depositKey = derivePrivateKey(source.derivationIndex, "TRC20");
      const hash = await broadcastTrc20UsdtWithdrawal(
        depositKey,
        source.address,
        withdrawal.toAddress,
        sendAmount
      );
      txHashes.push(hash);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }
  }

  if (remaining > 0.000001) {
    throw new Error(
      `Could not source enough USDT for withdrawal (short ${remaining.toFixed(4)} USDT)`
    );
  }

  return txHashes.join(",");
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

      let txHash: string;

      if (withdrawal.network === "TRC20" && withdrawal.currency === "USDT") {
        txHash = await processTrc20UsdtWithdrawal(withdrawal, wallet, privateKey);
      } else {
        txHash = await broadcastFromPrivateKey(
          privateKey,
          withdrawal.toAddress,
          Number(withdrawal.amount),
          withdrawal.currency,
          withdrawal.network
        );
      }

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
