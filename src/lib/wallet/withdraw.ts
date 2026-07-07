import { eq, sql } from "drizzle-orm";
import { db, withdrawals, wallets } from "../db";
import { fetchOnChainBalance } from "../blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";
import { findTrc20DepositSourcesWithBalance } from "./tron-deposits";
import { findEvmDepositSourcesWithBalance } from "../evm/deposits";
import { findSplDepositSourcesWithBalance } from "./spl-deposits";
import { fundTronAddressIfNeeded, reclaimTronTrxToGasWallet } from "./tron-gas";
import { fundEvmNativeIfNeeded, reclaimEvmNativeToGasWallet } from "../evm/gas";
import { fundSolIfNeeded } from "./spl-gas";
import { isEvmUsdtNetwork } from "../evm/chains";

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

async function refundWithdrawalBalance(
  withdrawal: { walletId: string | null; amount: string },
  netSent = 0
): Promise<void> {
  if (!withdrawal.walletId) return;

  const gross = Number(withdrawal.amount);
  const refund = Math.round((gross - netSent) * 1e6) / 1e6;
  if (refund <= 0) return;

  const [wallet] = await db
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.id, withdrawal.walletId))
    .limit(1);

  if (!wallet) return;

  await db
    .update(wallets)
    .set({
      balance: sql`${wallets.balance}::numeric + ${String(refund)}`,
    })
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
  withdrawal: { toAddress: string; amount: string; feeAmount: string | null; currency: string; network: string },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  let remaining = netAmount;
  const txHashes: string[] = [];

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
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

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        throw new Error(
          `Insufficient on-chain USDT (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${netAmount.toFixed(4)}). ` +
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

  return txHashes.join(",");
}

async function broadcastEvmUsdtWithdrawal(
  network: string,
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  await fundEvmNativeIfNeeded(network, fromAddress);
  const txHash = await broadcastFromPrivateKey(
    privateKey,
    toAddress,
    amount,
    "USDT",
    network
  );
  await reclaimEvmNativeToGasWallet(network, privateKey, fromAddress);
  return txHash;
}

async function processEvmUsdtWithdrawal(
  withdrawal: { toAddress: string; amount: string; feeAmount: string | null; currency: string; network: string },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  let remaining = netAmount;
  const txHashes: string[] = [];
  const network = withdrawal.network;

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
    if (custodialBalance > 0.000001) {
      const sendAmount = Math.min(custodialBalance, remaining);
      const hash = await broadcastEvmUsdtWithdrawal(
        network,
        privateKey,
        wallet.address,
        withdrawal.toAddress,
        sendAmount
      );
      txHashes.push(hash);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }

    if (remaining > 0.000001) {
      const depositSources = await findEvmDepositSourcesWithBalance(
        wallet.userId,
        wallet.id,
        network
      );
      const depositTotal = depositSources.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        throw new Error(
          `Insufficient on-chain USDT (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${netAmount.toFixed(4)}). ` +
            "Funds may still be confirming — wait a few minutes and retry."
        );
      }

      for (const source of depositSources) {
        if (remaining <= 0.000001) break;

        const sendAmount = Math.min(source.balance, remaining);
        const depositKey = derivePrivateKey(source.derivationIndex, network);
        const hash = await broadcastEvmUsdtWithdrawal(
          network,
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

  return txHashes.join(",");
}

async function broadcastSplUsdtWithdrawal(
  privateKey: string,
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<string> {
  await fundSolIfNeeded(fromAddress);
  return broadcastFromPrivateKey(privateKey, toAddress, amount, "USDT", "SPL");
}

async function processSplUsdtWithdrawal(
  withdrawal: { toAddress: string; amount: string; feeAmount: string | null; currency: string; network: string },
  wallet: typeof wallets.$inferSelect,
  privateKey: string
): Promise<string> {
  const netAmount = getNetSendAmount(withdrawal);
  let remaining = netAmount;
  const txHashes: string[] = [];

  const custodial = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
  const custodialBalance = custodial.amount ?? 0;

  try {
    if (custodialBalance > 0.000001) {
      const sendAmount = Math.min(custodialBalance, remaining);
      const hash = await broadcastSplUsdtWithdrawal(
        privateKey,
        wallet.address,
        withdrawal.toAddress,
        sendAmount
      );
      txHashes.push(hash);
      remaining = Math.round((remaining - sendAmount) * 1e6) / 1e6;
    }

    if (remaining > 0.000001) {
      const depositSources = await findSplDepositSourcesWithBalance(wallet.userId, wallet.id);
      const depositTotal = depositSources.reduce((sum, s) => sum + s.balance, 0);

      if (custodialBalance + depositTotal + 0.000001 < netAmount) {
        throw new Error(
          `Insufficient on-chain USDT (have ${(custodialBalance + depositTotal).toFixed(4)}, need ${netAmount.toFixed(4)}). ` +
            "Funds may still be confirming — wait a few minutes and retry."
        );
      }

      for (const source of depositSources) {
        if (remaining <= 0.000001) break;

        const sendAmount = Math.min(source.balance, remaining);
        const depositKey = derivePrivateKey(source.derivationIndex, "SPL");
        const hash = await broadcastSplUsdtWithdrawal(
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

  return txHashes.join(",");
}

export async function processPendingWithdrawals(): Promise<number> {
  const pending = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.status, "pending"));

  let processed = 0;

  for (const withdrawal of pending) {
    let netSent = 0;

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
      } else if (isEvmUsdtNetwork(withdrawal.network) && withdrawal.currency === "USDT") {
        txHash = await processEvmUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else if (withdrawal.network === "SPL" && withdrawal.currency === "USDT") {
        txHash = await processSplUsdtWithdrawal(withdrawal, wallet, privateKey);
      } else {
        const netAmount = getNetSendAmount(withdrawal);
        txHash = await broadcastFromPrivateKey(
          privateKey,
          withdrawal.toAddress,
          netAmount,
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
      if (err instanceof PartialWithdrawalError) {
        netSent = err.netSent;
      }
      await refundWithdrawalBalance(withdrawal, netSent);
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
