import { eq, sql, isNull, and, or, like } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";
import { findTrc20DepositSourcesWithBalance } from "./tron-deposits";
import { isTronRateLimitError } from "../blockchain/trongrid";
import { findEvmDepositSourcesWithBalance } from "../evm/deposits";
import { findSplDepositSourcesWithBalance } from "./spl-deposits";
import { fundTronAddressIfNeeded, reclaimTronTrxToGasWallet } from "./tron-gas";
import { fundEvmNativeIfNeeded, reclaimEvmNativeToGasWallet } from "../evm/gas";
import { fundSolIfNeeded } from "./spl-gas";
import { isStablecoin } from "../constants";
import { isEvmUsdtNetwork } from "../evm/chains";
import {
  assertPositiveNetAmount,
  isValidTxHashForNetwork,
  isVerifyAmbiguousError,
  verifyWithdrawalTransactions,
  verifyTronTransactionSuccess,
  verifyEvmTransactionSuccess,
} from "./tx-verify";
class PartialWithdrawalError extends Error {
  constructor(
    message: string,
    public netSent: number
  ) {
    super(message);
    this.name = "PartialWithdrawalError";
  }
}

function getNetSendAmount(withdrawal: {
  amount: string;
  feeAmount: string | null;
  currency: string;
  network: string;
}): number {
  const gross = Number(withdrawal.amount);
  if (withdrawal.feeAmount != null && withdrawal.feeAmount !== "") {
    return Math.round((gross - Number(withdrawal.feeAmount)) * 1e6) / 1e6;
  }
  return gross;
}

function assertWithdrawalBroadcastResult(
  txHash: string,
  withdrawal: { currency: string; network: string; amount: string; feeAmount: string | null }
): void {
  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);
  if (!txHash?.trim()) {
    throw new Error("Withdrawal broadcast returned no transaction id");
  }
}

async function appendWithdrawalTxHash(
  withdrawalId: string,
  newHash: string,
  existing?: string | null
): Promise<string> {
  const combined = existing?.trim() ? `${existing},${newHash}` : newHash;
  await db
    .update(withdrawals)
    .set({ txHash: combined, error: null })
    .where(eq(withdrawals.id, withdrawalId));
  return combined;
}

async function refundWithdrawalBalance(
  withdrawal: {
    id: string;
    walletId: string | null;
    amount: string;
    balanceRefundedAt?: Date | null;
  },
  netSent = 0
): Promise<number> {
  if (!withdrawal.walletId) return 0;
  if (withdrawal.balanceRefundedAt) return 0;

  const gross = Number(withdrawal.amount);
  const refund = Math.round((gross - netSent) * 1e6) / 1e6;
  if (refund <= 0) return 0;

  const [wallet] = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, withdrawal.walletId))
    .limit(1);

  if (!wallet) return 0;

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance}::numeric + ${String(refund)}`,
    })
    .where(eq(wallets.id, withdrawal.walletId));

  await db
    .update(withdrawals)
    .set({
      balanceRefundedAt: new Date(),
      balanceRefundedAmount: String(refund),
    })
    .where(eq(withdrawals.id, withdrawal.id));

  return refund;
}

const RESTORED_BALANCE_MSG =
  "Withdrawal could not be completed. Your Drift wallet balance has been restored — please submit a new withdrawal.";

const FALSE_COMPLETE_MSG =
  "Withdrawal was marked complete without a confirmed on-chain payout. Your Drift wallet balance has been restored — please submit a new withdrawal.";

async function broadcastTrc20TokenWithdrawal(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  currency: string
): Promise<string> {
  await fundTronAddressIfNeeded(fromAddress);
  const txHash = await broadcastFromPrivateKey(
    privateKey,
    toAddress,
    amount,
    currency,
    "TRC20"
  );
  await reclaimTronTrxToGasWallet(privateKey, fromAddress);
  return txHash;
}

async function processTrc20UsdtWithdrawal(
  withdrawal: {
    id: string;
    toAddress: string;
    amount: string;
    feeAmount: string | null;
    currency: string;
    network: string;
    txHash: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  if (withdrawal.txHash?.trim()) {
    return withdrawal.txHash;
  }

  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);
  let remaining = netAmount;
  const txHashes: string[] = [];

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
    if (custodialBalance > 0.000001) {
      const sendAmount = Math.min(custodialBalance, remaining);
      const hash = await broadcastTrc20TokenWithdrawal(
        privateKey,
        wallet.address,
        withdrawal.toAddress,
        sendAmount,
        wallet.currency
      );
      txHashes.push(hash);
      await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }

    if (remaining > 0.000001) {
      const depositSources = await findTrc20DepositSourcesWithBalance(wallet.userId, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        const skipped = depositSources.length - spendable.length;
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)} spendable across wallet + ${spendable.length} deposit address(es), need ${netAmount.toFixed(4)} net)` +
            (skipped > 0 ? ` — ${skipped} deposit address(es) missing keys and cannot be swept.` : "") +
            " Payments may still be confirming — wait a few minutes and retry."
        );
      }

      for (const source of spendable) {
        if (remaining <= 0.000001) break;

        const sendAmount = Math.min(source.balance, remaining);
        const depositKey = derivePrivateKey(source.derivationIndex!, "TRC20");
        const hash = await broadcastTrc20TokenWithdrawal(
          depositKey,
          source.address,
          withdrawal.toAddress,
          sendAmount,
          wallet.currency
        );
        txHashes.push(hash);
        await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = netAmount - remaining;
    if (netSent > 0.000001 && !(err instanceof PartialWithdrawalError)) {
      throw new PartialWithdrawalError(
        err instanceof Error ? err.message : "Withdrawal broadcast failed",
        netSent
      );
    }
    throw err;
  }

  if (txHashes.length === 0) {
    throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
  }

  return txHashes.join(",");
}

async function broadcastEvmTokenWithdrawal(
  network: string,
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  currency: string
): Promise<string> {
  await fundEvmNativeIfNeeded(network, fromAddress);
  const txHash = await broadcastFromPrivateKey(
    privateKey,
    toAddress,
    amount,
    currency,
    network
  );
  await reclaimEvmNativeToGasWallet(network, privateKey, fromAddress);
  return txHash;
}

async function processEvmUsdtWithdrawal(
  withdrawal: {
    id: string;
    toAddress: string;
    amount: string;
    feeAmount: string | null;
    currency: string;
    network: string;
    txHash: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  if (withdrawal.txHash?.trim()) return withdrawal.txHash;

  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);
  let remaining = netAmount;
  const txHashes: string[] = [];
  const network = withdrawal.network;

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
    if (custodialBalance > 0.000001) {
      const sendAmount = Math.min(custodialBalance, remaining);
      const hash = await broadcastEvmTokenWithdrawal(
        network,
        privateKey,
        wallet.address,
        withdrawal.toAddress,
        sendAmount,
        wallet.currency
      );
      txHashes.push(hash);
      await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }

    if (remaining > 0.000001) {
      const depositSources = await findEvmDepositSourcesWithBalance(wallet.userId, network, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${netAmount.toFixed(4)}). ` +
            "Funds may still be confirming — wait a few minutes and retry."
        );
      }

      for (const source of spendable) {
        if (remaining <= 0.000001) break;

        const sendAmount = Math.min(source.balance, remaining);
        const depositKey = derivePrivateKey(source.derivationIndex!, network);
        const hash = await broadcastEvmTokenWithdrawal(
          network,
          depositKey,
          source.address,
          withdrawal.toAddress,
          sendAmount,
          wallet.currency
        );
        txHashes.push(hash);
        await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = netAmount - remaining;
    if (netSent > 0.000001 && !(err instanceof PartialWithdrawalError)) {
      throw new PartialWithdrawalError(
        err instanceof Error ? err.message : "Withdrawal broadcast failed",
        netSent
      );
    }
    throw err;
  }

  if (txHashes.length === 0) {
    throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
  }

  return txHashes.join(",");
}

async function broadcastSplTokenWithdrawal(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number,
  currency: string
): Promise<string> {
  await fundSolIfNeeded(fromAddress);
  const txHash = await broadcastFromPrivateKey(privateKey, toAddress, amount, currency, "SPL");
  const { reclaimSolToGasWallet } = await import("./spl-gas");
  await reclaimSolToGasWallet(privateKey, fromAddress);
  return txHash;
}

async function processSplUsdtWithdrawal(
  withdrawal: {
    id: string;
    toAddress: string;
    amount: string;
    feeAmount: string | null;
    currency: string;
    network: string;
    txHash: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  if (withdrawal.txHash?.trim()) return withdrawal.txHash;

  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);
  let remaining = netAmount;
  const txHashes: string[] = [];

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
    if (custodialBalance > 0.000001) {
      const sendAmount = Math.min(custodialBalance, remaining);
      const hash = await broadcastSplTokenWithdrawal(
        privateKey,
        wallet.address,
        withdrawal.toAddress,
        sendAmount,
        wallet.currency
      );
      txHashes.push(hash);
      await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }

    if (remaining > 0.000001) {
      const depositSources = await findSplDepositSourcesWithBalance(wallet.userId, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${netAmount.toFixed(4)}). ` +
            "Funds may still be confirming — wait a few minutes and retry."
        );
      }

      for (const source of spendable) {
        if (remaining <= 0.000001) break;

        const sendAmount = Math.min(source.balance, remaining);
        const depositKey = derivePrivateKey(source.derivationIndex!, "SPL");
        const hash = await broadcastSplTokenWithdrawal(
          depositKey,
          source.address,
          withdrawal.toAddress,
          sendAmount,
          wallet.currency
        );
        txHashes.push(hash);
        await appendWithdrawalTxHash(withdrawal.id, hash, txHashes.slice(0, -1).join(",") || null);
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = netAmount - remaining;
    if (netSent > 0.000001 && !(err instanceof PartialWithdrawalError)) {
      throw new PartialWithdrawalError(
        err instanceof Error ? err.message : "Withdrawal broadcast failed",
        netSent
      );
    }
    throw err;
  }

  if (txHashes.length === 0) {
    throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
  }

  return txHashes.join(",");
}

function isRetryableWithdrawalError(err: unknown): boolean {
  if (isTronRateLimitError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limit|too many requests|try again in a minute/i.test(msg);
}

function isConfirmationPendingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not confirmed on-chain in time/i.test(msg);
}

export { getWithdrawableOnChain as getTrc20WithdrawableOnChain } from "./withdrawable";

/** Fix withdrawals wrongly marked completed without a valid on-chain transaction. */
async function repairInvalidCompletedWithdrawals(): Promise<number> {
  const recent = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.status, "completed"));

  let repaired = 0;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const w of recent) {
    if (new Date(w.completedAt ?? w.createdAt).getTime() < cutoff) continue;

    const primaryHash = w.txHash?.split(",")[0]?.trim() ?? "";
    let invalid = !primaryHash || !isValidTxHashForNetwork(primaryHash, w.currency, w.network);

    if (!invalid && w.network === "TRC20" && isStablecoin(w.currency)) {
      try {
        await verifyTronTransactionSuccess(primaryHash, 20_000);
      } catch {
        invalid = true;
      }
    }

    if (!invalid && isEvmUsdtNetwork(w.network) && isStablecoin(w.currency)) {
      try {
        await verifyEvmTransactionSuccess(primaryHash, w.network, 20_000);
      } catch {
        invalid = true;
      }
    }

    if (!invalid) continue;

    const refunded = await refundWithdrawalBalance(w);
    await db
      .update(withdrawals)
      .set({
        status: "failed",
        error:
          refunded > 0
            ? FALSE_COMPLETE_MSG
            : "Withdrawal was marked complete without a confirmed on-chain payout. Contact support to restore your balance.",
      })
      .where(eq(withdrawals.id, w.id));
    repaired++;
  }

  return repaired;
}

/** Retry ledger refunds for failed withdrawals that claimed balance was restored but never credited. */
async function repairUnrefundedFailedWithdrawals(): Promise<number> {
  const stuck = await db
    .select()
    .from(withdrawals)
    .where(
      and(
        eq(withdrawals.status, "failed"),
        isNull(withdrawals.balanceRefundedAt),
        or(
          like(withdrawals.error, "%balance has been restored%"),
          like(withdrawals.error, "%Balance has been restored%")
        )
      )
    );

  let repaired = 0;

  for (const w of stuck) {
    const refunded = await refundWithdrawalBalance(w);
    if (refunded > 0) {
      await db
        .update(withdrawals)
        .set({ error: FALSE_COMPLETE_MSG })
        .where(eq(withdrawals.id, w.id));
      repaired++;
    }
  }

  return repaired;
}

export async function refundWithdrawalById(withdrawalId: string): Promise<number> {
  const [w] = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .limit(1);

  if (!w) throw new Error("Withdrawal not found");
  if (w.status === "completed") throw new Error("Cannot refund a completed withdrawal");
  return refundWithdrawalBalance(w);
}

export async function processPendingWithdrawals(): Promise<number> {
  await repairInvalidCompletedWithdrawals();
  await repairUnrefundedFailedWithdrawals();

  const pending = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.status, "pending"));

  let processed = 0;

  for (const withdrawal of pending) {
    let netSent = 0;
    let txHash: string | undefined;

    try {
      if (!withdrawal.walletId) {
        await db
          .update(withdrawals)
          .set({
            status: "failed",
            error: "Withdrawals require a custodial wallet",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, withdrawal.walletId))
        .limit(1);

      if (!wallet || wallet.walletType !== "generated") {
        const refunded = await refundWithdrawalBalance(withdrawal);
        await db
          .update(withdrawals)
          .set({
            status: "failed",
            error:
              refunded > 0
                ? RESTORED_BALANCE_MSG
                : "Invalid custodial wallet — contact support to restore balance",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const privateKey = getPrivateKeyFromWallet(wallet.encryptedPrivateKey);
      if (!privateKey) {
        const refunded = await refundWithdrawalBalance(withdrawal);
        await db
          .update(withdrawals)
          .set({
            status: "failed",
            error:
              refunded > 0
                ? RESTORED_BALANCE_MSG
                : "Missing wallet private key — contact support to restore balance",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      if (withdrawal.txHash) {
        txHash = withdrawal.txHash;
      } else if (withdrawal.network === "TRC20" && isStablecoin(withdrawal.currency)) {
        txHash = await processTrc20UsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (isEvmUsdtNetwork(withdrawal.network) && isStablecoin(withdrawal.currency)) {
        txHash = await processEvmUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (withdrawal.network === "SPL" && isStablecoin(withdrawal.currency)) {
        txHash = await processSplUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else {
        const netAmount = getNetSendAmount(withdrawal);
        assertPositiveNetAmount(netAmount);
        txHash = await broadcastFromPrivateKey(
          privateKey,
          withdrawal.toAddress,
          netAmount,
          withdrawal.currency,
          withdrawal.network
        );
        await appendWithdrawalTxHash(withdrawal.id, txHash);
      }

      assertWithdrawalBroadcastResult(txHash, withdrawal);
      await verifyWithdrawalTransactions(txHash, withdrawal.currency, withdrawal.network);

      await db
        .update(withdrawals)
        .set({ status: "completed", txHash, completedAt: new Date(), error: null })
        .where(eq(withdrawals.id, withdrawal.id));
      processed++;
    } catch (err) {
      if (err instanceof PartialWithdrawalError) {
        netSent = err.netSent;
        if (txHash) {
          await db
            .update(withdrawals)
            .set({
              txHash,
              error: err instanceof Error ? err.message : "Partial withdrawal broadcast",
            })
            .where(eq(withdrawals.id, withdrawal.id));
          continue;
        }
      }

      if (
        (typeof txHash !== "undefined" && (isConfirmationPendingError(err) || isVerifyAmbiguousError(err)))
      ) {
        await db
          .update(withdrawals)
          .set({
            txHash,
            error: err instanceof Error ? err.message : "Awaiting on-chain confirmation",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      if (isRetryableWithdrawalError(err)) {
        await db
          .update(withdrawals)
          .set({
            error: err instanceof Error ? err.message : "TronGrid rate limit — will retry",
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const refunded = await refundWithdrawalBalance(withdrawal, netSent);
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          error:
            refunded > 0
              ? `${err instanceof Error ? err.message : "Withdrawal broadcast failed"}. ${RESTORED_BALANCE_MSG}`
              : err instanceof Error
                ? err.message
                : "Withdrawal broadcast failed",
        })
        .where(eq(withdrawals.id, withdrawal.id));
    }
  }

  return processed;
}
