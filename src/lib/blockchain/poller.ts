import { eq, and } from "drizzle-orm";
import { db, paymentLinks, transactions, wallets, users } from "../db";
import { calculateFee } from "../fees";
import { getRequiredConfirmations, getDecimals, TOKEN_CONTRACTS } from "../constants";
import { dispatchWebhooks } from "../webhooks";
import { queueSettlements } from "../wallet/settlement";
import { sendPaymentReceivedEmails } from "../email/send";

interface DetectedPayment {
  txHash: string;
  amount: number;
  currency: string;
  network: string;
  confirmations: number;
  depositAddress: string;
}

const USDT_TRC20 = TOKEN_CONTRACTS.TRC20.USDT;

async function pollTron(address: string): Promise<DetectedPayment[]> {
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
        tx.to === address &&
        tx.token_info &&
        (tx.token_info as { address: string }).address === USDT_TRC20
    )
    .map((tx: Record<string, unknown>) => ({
      txHash: tx.transaction_id as string,
      amount: Number(tx.value) / 1e6,
      currency: "USDT",
      network: "TRC20",
      confirmations: Number(tx.confirmed ?? 0) ? 20 : 1,
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
  const contracts = TOKEN_CONTRACTS[network as keyof typeof TOKEN_CONTRACTS];
  const contract = contracts?.[currency];

  const res = await fetch(
    `${apiUrl}?module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== "1") return [];

  const decimals = getDecimals(currency);

  return (data.result ?? [])
    .filter(
      (tx: Record<string, string>) =>
        tx.to?.toLowerCase() === address.toLowerCase() &&
        (!contract || tx.contractAddress?.toLowerCase() === contract.toLowerCase())
    )
    .slice(0, 15)
    .map((tx: Record<string, string>) => ({
      txHash: tx.hash,
      amount: Number(tx.value) / Math.pow(10, decimals),
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
  const tipHeight = await getBitcoinBlockHeight();
  const results: DetectedPayment[] = [];

  for (const tx of (txs ?? []).slice(0, 10)) {
    const vout = tx.vout as Array<{ scriptpubkey_address: string; value: number }>;
    const status = tx.status as { confirmed: boolean; block_height?: number };
    const matching = vout?.filter((o) => o.scriptpubkey_address === address) ?? [];
    const confirmations = status.confirmed && status.block_height
      ? Math.max(tipHeight - status.block_height + 1, 1)
      : 0;

    for (const o of matching) {
      results.push({
        txHash: tx.txid as string,
        amount: o.value / 1e8,
        currency: "BTC",
        network: "Bitcoin",
        confirmations,
        depositAddress: address,
      });
    }
  }

  return results;
}

let cachedBtcHeight = 0;
let btcHeightAt = 0;
async function getBitcoinBlockHeight(): Promise<number> {
  if (Date.now() - btcHeightAt < 60_000 && cachedBtcHeight) return cachedBtcHeight;
  const res = await fetch("https://blockstream.info/api/blocks/tip/height");
  if (res.ok) {
    cachedBtcHeight = Number(await res.text());
    btcHeightAt = Date.now();
  }
  return cachedBtcHeight || 800000;
}

async function pollSolana(address: string): Promise<DetectedPayment[]> {
  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

  const sigRes = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getSignaturesForAddress",
      params: [address, { limit: 10 }],
    }),
  });
  if (!sigRes.ok) return [];
  const sigData = await sigRes.json();

  const results: DetectedPayment[] = [];

  for (const sig of (sigData.result ?? []).slice(0, 5)) {
    const txRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
    });
    if (!txRes.ok) continue;
    const txData = await txRes.json();
    const tx = txData.result;
    if (!tx?.meta || tx.meta.err) continue;

    const pre = tx.meta.preBalances as number[];
    const post = tx.meta.postBalances as number[];
    const accountKeys = tx.transaction.message.accountKeys as Array<{ pubkey: string }>;
    const idx = accountKeys.findIndex((k) => k.pubkey === address);
    if (idx < 0) continue;

    const delta = (post[idx] - pre[idx]) / 1e9;
    if (delta <= 0) continue;

    results.push({
      txHash: sig.signature,
      amount: delta,
      currency: "SOL",
      network: "Solana",
      confirmations: sig.confirmationStatus === "finalized" ? 32 : 1,
      depositAddress: address,
    });
  }

  return results;
}

export async function pollAllNetworks() {
  const activeLinks = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.status, "active"));

  const now = new Date();
  const validLinks = activeLinks.filter((l) => !l.expiry || l.expiry > now);

  const addresses = new Map<string, { currency: string; network: string }>();
  for (const link of validLinks) {
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

  await updateConfirmingTransactions();

  return detected.length;
}

async function updateConfirmingTransactions() {
  const confirming = await db
    .select()
    .from(transactions)
    .where(eq(transactions.status, "confirming"));

  for (const tx of confirming) {
    if (!tx.txHash) continue;
    const required = getRequiredConfirmations(tx.currency);
    const current = Number(tx.confirmations ?? 0);
    if (current >= required) {
      await completeTransaction(tx.id);
    }
  }
}

async function processDetectedPayment(payment: DetectedPayment) {
  if (!payment.txHash) return;

  const [existing] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.txHash, payment.txHash))
    .limit(1);

  if (existing) {
    if (existing.status === "confirming") {
      await db
        .update(transactions)
        .set({
          confirmations: String(payment.confirmations),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, existing.id));

      if (payment.confirmations >= getRequiredConfirmations(existing.currency)) {
        await completeTransaction(existing.id);
      }
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
  if (link.expiry && link.expiry < new Date()) return;

  const expectedAmount = Number(link.amount);
  const tolerance = expectedAmount * 0.01;
  let status = "confirming";

  if (payment.amount > 0 && payment.amount < expectedAmount - tolerance) {
    status = "underpaid";
  } else if (payment.amount > expectedAmount + tolerance) {
    status = "overpaid";
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
      status,
      txHash: payment.txHash,
      feeAmount: String(feeAmount),
      netAmount: String(netAmount),
      customerEmail: link.customerEmail,
      confirmations: String(payment.confirmations),
    })
    .returning();

  await dispatchWebhooks(link.userId, tx.id, "transaction.confirming");

  if (
    (status === "confirming" || status === "overpaid") &&
    payment.confirmations >= getRequiredConfirmations(link.currency)
  ) {
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
  if (tx.status === "underpaid" || tx.status === "failed") return;

  const net = Number(tx.netAmount ?? 0);
  const fee = Number(tx.feeAmount ?? 0);

  await db
    .update(transactions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(transactions.id, transactionId));

  let wallet: (typeof wallets.$inferSelect) | null = null;

  if (tx.paymentLinkId) {
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.id, tx.paymentLinkId))
      .limit(1);

    if (link?.walletId) {
      const [w] = await db.select().from(wallets).where(eq(wallets.id, link.walletId)).limit(1);
      wallet = w ?? null;
    }
  }

  if (!wallet) {
    const [w] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, tx.userId), eq(wallets.currency, tx.currency)))
      .limit(1);
    wallet = w ?? null;
  }

  if (wallet) {
    const newBalance = Number(wallet.balance) + net;
    await db
      .update(wallets)
      .set({ balance: String(newBalance) })
      .where(eq(wallets.id, wallet.id));
  }

  if (tx.paymentLinkId) {
    const [link] = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.id, tx.paymentLinkId))
      .limit(1);

    if (link) {
      await db
        .update(paymentLinks)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(paymentLinks.id, link.id));

      await queueSettlements(
        transactionId,
        tx.userId,
        tx.currency,
        tx.network,
        fee,
        net,
        link.derivationIndex,
        link.walletId
      );
    }
  }

  await dispatchWebhooks(tx.userId, transactionId, "transaction.completed");

  const [merchant] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, tx.userId))
    .limit(1);

  let linkTitle: string | undefined;
  if (tx.paymentLinkId) {
    const [linkRow] = await db
      .select({ title: paymentLinks.title, customerEmail: paymentLinks.customerEmail })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, tx.paymentLinkId))
      .limit(1);
    linkTitle = linkRow?.title;
  }

  const customer =
    tx.customerEmail ?? "Customer";
  const customerEmailForReceipt = tx.customerEmail;

  if (merchant?.email) {
    sendPaymentReceivedEmails(merchant.email, customerEmailForReceipt, {
      amount: String(tx.amount),
      currency: tx.currency,
      network: tx.network,
      customer,
      transactionId: tx.id,
      feeAmount: String(fee),
      netAmount: String(net),
      linkTitle,
    }).catch((err) => console.error("[email] Payment notification failed:", err));
  }
}
