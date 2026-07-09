import { eq, sql, isNull, and, or, like } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";
import { findTrc20DepositSourcesWithBalance } from "./tron-deposits";
import { isTronRateLimitError } from "../blockchain/trongrid";
import { findEvmDepositSourcesWithBalance } from "../evm/deposits";
import { findSplDepositSourcesWithBalance } from "./spl-deposits";
import { fundTronAddressIfNeeded, isTronGasWalletError, reclaimTronTrxToGasWallet } from "./tron-gas";
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
  existing?: string | null,
  netSent?: number
): Promise<string> {
  const combined = existing?.trim() ? `${existing},${newHash}` : newHash;
  await db
    .update(withdrawals)
    .set({
      txHash: combined,
      error: null,
      ...(netSent != null ? { netSent: String(netSent) } : {}),
    })
    .where(eq(withdrawals.id, withdrawalId));
  return combined;
}

async function refundWithdrawalBalance(
  withdrawal: {
    id: string;
    walletId: string | null;
    amount: string;
    balanceRefundedAt?: Date | null;
    netSent?: string | null;
  },
  netSentOverride?: number
): Promise<number> {
  if (!withdrawal.walletId) return 0;
  if (withdrawal.balanceRefundedAt) return 0;

  const gross = Number(withdrawal.amount);
  const netSent =
    netSentOverride != null
      ? netSentOverride
      : Number(withdrawal.netSent ?? 0);
  const refund = Math.round((gross - netSent) * 1e6) / 1e6;
  if (refund <= 0) return 0;

  return db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(withdrawals)
      .set({
        balanceRefundedAt: new Date(),
        balanceRefundedAmount: String(refund),
      })
      .where(
        and(eq(withdrawals.id, withdrawal.id), isNull(withdrawals.balanceRefundedAt))
      )
      .returning({ id: withdrawals.id });

    if (!claimed) return 0;

    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance}::numeric + ${String(refund)}`,
      })
      .where(eq(wallets.id, withdrawal.walletId!));

    return refund;
  });
}

/** Claim a pending withdrawal for processing (prevents concurrent double-broadcast). */
async function claimPendingWithdrawal(id: string) {
  const [claimed] = await db
    .update(withdrawals)
    .set({ status: "processing", processingStartedAt: new Date() })
    .where(
      and(
        eq(withdrawals.id, id),
        eq(withdrawals.status, "pending"),
        isNull(withdrawals.balanceRefundedAt)
      )
    )
    .returning();
  return claimed ?? null;
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
    netSent?: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);

  const alreadySent = Number(withdrawal.netSent ?? 0);
  let remaining = Math.round((netAmount - alreadySent) * 1e6) / 1e6;
  const txHashes: string[] = withdrawal.txHash?.trim()
    ? withdrawal.txHash.split(",").map((h) => h.trim()).filter(Boolean)
    : [];

  if (remaining <= 0.000001) {
    if (txHashes.length === 0) {
      throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
    }
    return txHashes.join(",");
  }

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
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
      await appendWithdrawalTxHash(
        withdrawal.id,
        hash,
        txHashes.slice(0, -1).join(",") || null,
        netSentSoFar
      );
    }

    if (remaining > 0.000001) {
      const depositSources = await findTrc20DepositSourcesWithBalance(wallet.userId, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < remaining) {
        const skipped = depositSources.length - spendable.length;
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)} spendable across wallet + ${spendable.length} deposit address(es), need ${remaining.toFixed(4)} remaining)` +
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
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
        const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
        await appendWithdrawalTxHash(
          withdrawal.id,
          hash,
          txHashes.slice(0, -1).join(",") || null,
          netSentSoFar
        );
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = Math.round((netAmount - remaining) * 1e6) / 1e6;
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
    netSent?: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);

  const alreadySent = Number(withdrawal.netSent ?? 0);
  let remaining = Math.round((netAmount - alreadySent) * 1e6) / 1e6;
  const txHashes: string[] = withdrawal.txHash?.trim()
    ? withdrawal.txHash.split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  const network = withdrawal.network;

  if (remaining <= 0.000001) {
    if (txHashes.length === 0) {
      throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
    }
    return txHashes.join(",");
  }

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
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
      await appendWithdrawalTxHash(
        withdrawal.id,
        hash,
        txHashes.slice(0, -1).join(",") || null,
        netSentSoFar
      );
    }

    if (remaining > 0.000001) {
      const depositSources = await findEvmDepositSourcesWithBalance(wallet.userId, network, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < remaining) {
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${remaining.toFixed(4)} remaining). ` +
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
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
        const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
        await appendWithdrawalTxHash(
          withdrawal.id,
          hash,
          txHashes.slice(0, -1).join(",") || null,
          netSentSoFar
        );
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = Math.round((netAmount - remaining) * 1e6) / 1e6;
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
    netSent?: string | null;
  },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  assertPositiveNetAmount(netAmount);

  const alreadySent = Number(withdrawal.netSent ?? 0);
  let remaining = Math.round((netAmount - alreadySent) * 1e6) / 1e6;
  const txHashes: string[] = withdrawal.txHash?.trim()
    ? withdrawal.txHash.split(",").map((h) => h.trim()).filter(Boolean)
    : [];

  if (remaining <= 0.000001) {
    if (txHashes.length === 0) {
      throw new Error(`No on-chain ${wallet.currency} transfer was broadcast for this withdrawal`);
    }
    return txHashes.join(",");
  }

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
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
      const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
      await appendWithdrawalTxHash(
        withdrawal.id,
        hash,
        txHashes.slice(0, -1).join(",") || null,
        netSentSoFar
      );
    }

    if (remaining > 0.000001) {
      const depositSources = await findSplDepositSourcesWithBalance(wallet.userId, wallet.currency);
      const spendable = depositSources.filter((s) => s.derivationIndex != null);
      const depositTotal = spendable.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < remaining) {
        throw new Error(
          `Insufficient on-chain ${wallet.currency} (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${remaining.toFixed(4)} remaining). ` +
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
        remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
        const netSentSoFar = Math.round((netAmount - remaining) * 1e6) / 1e6;
        await appendWithdrawalTxHash(
          withdrawal.id,
          hash,
          txHashes.slice(0, -1).join(",") || null,
          netSentSoFar
        );
      }
    }

    if (remaining > 0.000001) {
      throw new Error(
        `Could not source enough ${wallet.currency} for withdrawal (short ${remaining.toFixed(4)} ${wallet.currency})`
      );
    }
  } catch (err) {
    const netSent = Math.round((netAmount - remaining) * 1e6) / 1e6;
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
  if (isTronGasWalletError(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /429|rate limit|too many requests|try again in a minute|gas wallet needs more TRX|Funds may still be confirming/i.test(
      msg
    )
  );
}

/** Re-queue failed withdrawals that hit transient errors and were not refunded. */
async function repairRetryableFailedWithdrawals(): Promise<void> {
  const failed = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.status, "failed"));

  for (const w of failed) {
    if (w.balanceRefundedAt) continue;
    const err = w.error ?? "";
    if (
      !/gas wallet needs more TRX|429|rate limit|too many requests|Funds may still be confirming/i.test(err)
    ) {
      continue;
    }
    await db
      .update(withdrawals)
      .set({ status: "pending", error: err })
      .where(eq(withdrawals.id, w.id));
  }
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

    const hashes = (w.txHash ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    let invalid = hashes.length === 0;
    for (const hash of hashes) {
      if (!isValidTxHashForNetwork(hash, w.currency, w.network)) {
        invalid = true;
        break;
      }
    }

    // Only mark invalid on definitive on-chain failure — never on timeout/ambiguous RPC errors
    if (!invalid && w.network === "TRC20" && isStablecoin(w.currency)) {
      for (const hash of hashes) {
        try {
          await verifyTronTransactionSuccess(hash, 20_000);
        } catch (err) {
          if (isVerifyAmbiguousError(err) || isConfirmationPendingError(err)) {
            invalid = false;
            break;
          }
          const msg = err instanceof Error ? err.message : String(err);
          if (/failed on-chain/i.test(msg)) {
            invalid = true;
            break;
          }
          // Ambiguous / HTTP errors: skip repair for this withdrawal
          invalid = false;
          break;
        }
      }
    }

    if (!invalid && isEvmUsdtNetwork(w.network) && isStablecoin(w.currency)) {
      for (const hash of hashes) {
        try {
          await verifyEvmTransactionSuccess(hash, w.network, 20_000);
        } catch (err) {
          if (isVerifyAmbiguousError(err) || isConfirmationPendingError(err)) {
            invalid = false;
            break;
          }
          const msg = err instanceof Error ? err.message : String(err);
          if (/failed on-chain/i.test(msg)) {
            invalid = true;
            break;
          }
          invalid = false;
          break;
        }
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

  const refunded = await refundWithdrawalBalance(w);

  // Cancel so the poller cannot broadcast after a manual refund
  if (w.status === "pending" || w.status === "processing") {
    await db
      .update(withdrawals)
      .set({
        status: "failed",
        error:
          refunded > 0
            ? `Admin refund applied. ${RESTORED_BALANCE_MSG}`
            : "Admin cancelled this withdrawal.",
      })
      .where(
        and(
          eq(withdrawals.id, withdrawalId),
          or(eq(withdrawals.status, "pending"), eq(withdrawals.status, "processing"))
        )
      );
  }

  return refunded;
}

export async function processPendingWithdrawals(): Promise<number> {
  await repairInvalidCompletedWithdrawals();
  await repairUnrefundedFailedWithdrawals();
  await repairRetryableFailedWithdrawals();

  // Re-queue stuck processing rows older than 10 minutes (crashed worker)
  const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000);
  await db
    .update(withdrawals)
    .set({ status: "pending", processingStartedAt: null })
    .where(
      and(
        eq(withdrawals.status, "processing"),
        isNull(withdrawals.balanceRefundedAt),
        sql`${withdrawals.processingStartedAt} < ${stuckCutoff}`
      )
    );

  const pending = await db
    .select()
    .from(withdrawals)
    .where(and(eq(withdrawals.status, "pending"), isNull(withdrawals.balanceRefundedAt)));

  let processed = 0;

  for (const row of pending) {
    const withdrawal = await claimPendingWithdrawal(row.id);
    if (!withdrawal) continue;

    let netSent = Number(withdrawal.netSent ?? 0);
    let txHash: string | undefined = withdrawal.txHash ?? undefined;

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

      const netAmount = getNetSendAmount(withdrawal);
      const alreadySent = Number(withdrawal.netSent ?? 0);
      const remaining = Math.round((netAmount - alreadySent) * 1e6) / 1e6;

      if (remaining <= 0.000001 && withdrawal.txHash?.trim()) {
        // Fully swept previously — just verify and complete
        txHash = withdrawal.txHash;
      } else if (withdrawal.network === "TRC20" && isStablecoin(withdrawal.currency)) {
        txHash = await processTrc20UsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (isEvmUsdtNetwork(withdrawal.network) && isStablecoin(withdrawal.currency)) {
        txHash = await processEvmUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (withdrawal.network === "SPL" && isStablecoin(withdrawal.currency)) {
        txHash = await processSplUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (withdrawal.txHash?.trim()) {
        txHash = withdrawal.txHash;
      } else {
        assertPositiveNetAmount(netAmount);
        txHash = await broadcastFromPrivateKey(
          privateKey,
          withdrawal.toAddress,
          netAmount,
          withdrawal.currency,
          withdrawal.network
        );
        await appendWithdrawalTxHash(withdrawal.id, txHash, null, netAmount);
      }

      assertWithdrawalBroadcastResult(txHash, withdrawal);
      await verifyWithdrawalTransactions(txHash, withdrawal.currency, withdrawal.network);

      const [completed] = await db
        .update(withdrawals)
        .set({
          status: "completed",
          txHash,
          completedAt: new Date(),
          error: null,
          netSent: String(getNetSendAmount(withdrawal)),
          processingStartedAt: null,
        })
        .where(
          and(
            eq(withdrawals.id, withdrawal.id),
            or(eq(withdrawals.status, "processing"), eq(withdrawals.status, "pending")),
            isNull(withdrawals.balanceRefundedAt)
          )
        )
        .returning({ id: withdrawals.id });

      if (completed) processed++;
    } catch (err) {
      if (err instanceof PartialWithdrawalError) {
        netSent = err.netSent;
        await db
          .update(withdrawals)
          .set({
            status: "pending",
            netSent: String(netSent),
            ...(txHash ? { txHash } : {}),
            error: err.message,
            processingStartedAt: null,
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      if (
        typeof txHash !== "undefined" &&
        (isConfirmationPendingError(err) || isVerifyAmbiguousError(err))
      ) {
        await db
          .update(withdrawals)
          .set({
            status: "pending",
            txHash,
            error: err instanceof Error ? err.message : "Awaiting on-chain confirmation",
            processingStartedAt: null,
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      if (isRetryableWithdrawalError(err)) {
        await db
          .update(withdrawals)
          .set({
            status: "pending",
            error: err instanceof Error ? err.message : "Temporary error — will retry",
            processingStartedAt: null,
          })
          .where(eq(withdrawals.id, withdrawal.id));
        continue;
      }

      const refunded = await refundWithdrawalBalance(withdrawal, netSent);
      await db
        .update(withdrawals)
        .set({
          status: "failed",
          processingStartedAt: null,
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
