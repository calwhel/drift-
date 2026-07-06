import { eq } from "drizzle-orm";
import { db, paymentLinks, transactions, wallets } from "@/lib/db";
import { completeTransaction } from "@/lib/blockchain/poller";
import { TOKEN_CONTRACTS } from "@/lib/constants";

const USDT_TRC20 = TOKEN_CONTRACTS.TRC20.USDT;

export async function cancelTransaction(transactionId: string) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!tx) throw new Error("Transaction not found");
  if (tx.status === "completed") throw new Error("Cannot cancel a completed transaction");

  await db
    .update(transactions)
    .set({
      status: "failed",
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, transactionId));
}

export async function adminCompleteTransaction(transactionId: string) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!tx) throw new Error("Transaction not found");
  if (tx.status === "completed") return tx;

  if (tx.status === "underpaid" || tx.status === "overpaid") {
    await db
      .update(transactions)
      .set({ status: "confirming", updatedAt: new Date() })
      .where(eq(transactions.id, transactionId));
  }

  await completeTransaction(transactionId);
}

interface OnChainTransfer {
  txHash: string;
  amount: number;
  to: string;
  blockTimestamp: number | null;
}

export async function fetchTrc20UsdtTransfers(address: string): Promise<OnChainTransfer[]> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=30&only_to=true`;
  const res = await fetch(url, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data ?? [])
    .filter(
      (tx: Record<string, unknown>) =>
        String(tx.to ?? "").toLowerCase() === address.toLowerCase() &&
        tx.token_info &&
        (tx.token_info as { address: string }).address === USDT_TRC20
    )
    .map((tx: Record<string, unknown>) => ({
      txHash: String(tx.transaction_id),
      amount: Number(tx.value) / 1e6,
      to: String(tx.to),
      blockTimestamp: tx.block_timestamp ? Number(tx.block_timestamp) : null,
    }));
}

export async function reconcileMerchantDeposits(userId: string) {
  const [userWallets, links, knownTxs] = await Promise.all([
    db.select().from(wallets).where(eq(wallets.userId, userId)),
    db.select().from(paymentLinks).where(eq(paymentLinks.userId, userId)),
    db.select({ txHash: transactions.txHash }).from(transactions).where(eq(transactions.userId, userId)),
  ]);

  const knownHashes = new Set(knownTxs.map((t) => t.txHash).filter(Boolean) as string[]);
  const addresses = new Map<string, { label: string; currency: string; network: string }>();

  for (const wallet of userWallets) {
    if (wallet.currency === "USDT" && wallet.network === "TRC20") {
      addresses.set(wallet.address, {
        label: `Wallet ${wallet.label ?? wallet.currency}`,
        currency: wallet.currency,
        network: wallet.network,
      });
    }
  }

  for (const link of links) {
    if (link.currency === "USDT" && link.network === "TRC20" && link.depositAddress) {
      addresses.set(link.depositAddress, {
        label: `Link: ${link.title}`,
        currency: link.currency,
        network: link.network,
      });
    }
  }

  const results = [];
  for (const [address, meta] of Array.from(addresses.entries())) {
    const transfers = await fetchTrc20UsdtTransfers(address);
    const unmatched = transfers.filter((t) => !knownHashes.has(t.txHash));
    const totalOnChain = transfers.reduce((sum, t) => sum + t.amount, 0);

    results.push({
      address,
      ...meta,
      recentTransferCount: transfers.length,
      totalRecentInflow: totalOnChain,
      unmatchedTransfers: unmatched,
    });
  }

  return results;
}
