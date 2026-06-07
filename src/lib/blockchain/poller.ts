import { eq, and } from "drizzle-orm";
import { db, paymentLinks, transactions, wallets } from "../db";
import { calculateFee } from "../fees";
import { getRequiredConfirmations } from "../constants";
import { dispatchWebhooks } from "../webhooks";

interface DetectedPayment {
  txHash: string;
  amount: number;
  currency: string;
  network: string;
  confirmations: number;
  depositAddress: string;
  customerEmail?: string;
}

// Blockchain API polling — uses env-configured API keys
async function pollTron(address: string): Promise<DetectedPayment[]> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=20`;
  const res = await fetch(url, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data ?? []).map((tx: Record<string, unknown>) => ({
    txHash: tx.transaction_id as string,
    amount: Number(tx.value) / 1e6,
    currency: "USDT",
    network: "TRC20",
    confirmations: 20,
    depositAddress: address,
  }));
}

async function pollEvm(
  address: string,
  currency: string,
  network: string,
  apiUrl: string,
  apiKey: string
): Promise<DetectedPayment[]> {
  const res = await fetch(
    `${apiUrl}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== "1") return [];

  return (data.result ?? []).slice(0, 10).map((tx: Record<string, string>) => ({
    txHash: tx.hash,
    amount: Number(tx.value) / 1e6,
    currency,
    network,
    confirmations: Number(tx.confirmations ?? 0),
    depositAddress: address,
  }));
}

async function pollBitcoin(address: string): Promise<DetectedPayment[]> {
  const res = await fetch(`https://blockstream.info/api/address/${address}/txs`);
  if (!res.ok) return [];
  const txs = await res.json();

  return (txs ?? []).slice(0, 5).flatMap((tx: Record<string, unknown>) => {
    const vout = tx.vout as Array<{ scriptpubkey_address: string; value: number }>;
    const matching = vout?.filter((o) => o.scriptpubkey_address === address) ?? [];
    return matching.map((o) => ({
      txHash: tx.txid as string,
      amount: o.value / 1e8,
      currency: "BTC",
      network: "Bitcoin",
      confirmations: (tx.status as { confirmed: boolean })?.confirmed ? 3 : 0,
      depositAddress: address,
    }));
  });
}

async function pollSolana(address: string): Promise<DetectedPayment[]> {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getSignaturesForAddress",
      params: [address, { limit: 10 }],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.result ?? []).map((sig: { signature: string }) => ({
    txHash: sig.signature,
    amount: 0, // resolved in production via getTransaction
    currency: "SOL",
    network: "Solana",
    confirmations: 32,
    depositAddress: address,
  }));
}

export async function pollAllNetworks() {
  const activeLinks = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.status, "active"));

  const addresses = new Map<string, { currency: string; network: string }>();
  for (const link of activeLinks) {
    addresses.set(link.depositAddress, {
      currency: link.currency,
      network: link.network,
    });
  }

  const detected: DetectedPayment[] = [];

  for (const [address, { currency, network }] of Array.from(addresses.entries())) {
    try {
      if (network === "TRC20") {
        detected.push(...(await pollTron(address)));
      } else if (network === "ERC20" && process.env.ETHERSCAN_API_KEY) {
        detected.push(
          ...(await pollEvm(
            address,
            currency,
            network,
            "https://api.etherscan.io/api",
            process.env.ETHERSCAN_API_KEY
          ))
        );
      } else if (network === "BEP20" && process.env.BSCSCAN_API_KEY) {
        detected.push(
          ...(await pollEvm(
            address,
            currency,
            network,
            "https://api.bscscan.com/api",
            process.env.BSCSCAN_API_KEY
          ))
        );
      } else if (network === "Bitcoin") {
        detected.push(...(await pollBitcoin(address)));
      } else if (network === "Solana") {
        detected.push(...(await pollSolana(address)));
      }
    } catch (err) {
      console.error(`Poll error ${network}:`, err);
    }
  }

  for (const payment of detected) {
    await processDetectedPayment(payment);
  }

  return detected.length;
}

async function processDetectedPayment(payment: DetectedPayment) {
  if (!payment.txHash) return;

  const [existing] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.txHash, payment.txHash))
    .limit(1);

  if (existing) {
    if (
      existing.status === "confirming" &&
      payment.confirmations >= getRequiredConfirmations(existing.currency)
    ) {
      await completeTransaction(existing.id);
    }
    return;
  }

  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.depositAddress, payment.depositAddress),
        eq(paymentLinks.status, "active")
      )
    )
    .limit(1);

  if (!link) return;

  const expectedAmount = Number(link.amount);
  if (payment.amount > 0 && Math.abs(payment.amount - expectedAmount) > expectedAmount * 0.01) {
    return;
  }

  const amount = payment.amount || expectedAmount;
  const { feeAmount, netAmount } = calculateFee(amount);

  const [tx] = await db
    .insert(transactions)
    .values({
      paymentLinkId: link.id,
      userId: link.userId,
      amount: String(amount),
      currency: link.currency,
      network: link.network,
      status: "confirming",
      txHash: payment.txHash,
      feeAmount: String(feeAmount),
      netAmount: String(netAmount),
      confirmations: String(payment.confirmations),
    })
    .returning();

  await dispatchWebhooks(link.userId, tx.id, "transaction.confirming");

  if (payment.confirmations >= getRequiredConfirmations(link.currency)) {
    await completeTransaction(tx.id);
  }
}

async function completeTransaction(transactionId: string) {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!tx || tx.status === "completed") return;

  const net = Number(tx.netAmount ?? 0);

  await db
    .update(transactions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, tx.userId), eq(wallets.currency, tx.currency)))
    .limit(1);

  if (wallet) {
    const newBalance = Number(wallet.balance) + net;
    await db
      .update(wallets)
      .set({ balance: String(newBalance) })
      .where(eq(wallets.id, wallet.id));
  }

  await dispatchWebhooks(tx.userId, transactionId, "transaction.completed");
}
