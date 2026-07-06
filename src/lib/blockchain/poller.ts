import { eq, and, desc } from "drizzle-orm";
import { db, paymentLinks, transactions, wallets, users } from "../db";
import { calculateFee } from "../fees";
import { getRequiredConfirmations, getDecimals, TOKEN_CONTRACTS } from "../constants";
import { dispatchWebhooks } from "../webhooks";
import { queueSettlements } from "../wallet/settlement";
import { notifyPaymentCompleted, notifyPaymentDetected } from "../telegram";
import {
  fetchBlockstreamAddressTxIds,
  fetchBlockstreamTipHeight,
  fetchBlockstreamTx,
  logBlockstreamError,
} from "./blockstream";
import { buildEtherscanV2Url } from "./etherscan";
import { validateWalletAddress } from "../wallet/generate";

interface DetectedPayment {
  txHash: string;
  amount: number;
  currency: string;
  network: string;
  confirmations: number;
  depositAddress: string;
  blockTimestamp?: number;
}

interface PollTarget {
  address: string;
  currency: string;
  network: string;
}

const USDT_TRC20 = TOKEN_CONTRACTS.TRC20.USDT;

function pollTargetKey(address: string, currency: string, network: string) {
  return `${address}|${currency}|${network}`;
}

function addressesMatch(stored: string, observed: string, network: string): boolean {
  const a = stored.trim();
  const b = observed.trim();
  if (a === b) return true;
  if (network === "ERC20" || network === "BEP20") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

async function getPollTargets(): Promise<PollTarget[]> {
  const now = new Date();
  const activeLinks = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.status, "active"));
  const validLinks = activeLinks.filter((l) => !l.expiry || l.expiry > now);

  const generatedWallets = await db
    .select({
      address: wallets.address,
      currency: wallets.currency,
      network: wallets.network,
    })
    .from(wallets)
    .where(eq(wallets.walletType, "generated"));

  const targets = new Map<string, PollTarget>();

  for (const link of validLinks) {
    targets.set(pollTargetKey(link.depositAddress, link.currency, link.network), {
      address: link.depositAddress,
      currency: link.currency,
      network: link.network,
    });
  }

  for (const wallet of generatedWallets) {
    targets.set(pollTargetKey(wallet.address, wallet.currency, wallet.network), {
      address: wallet.address,
      currency: wallet.currency,
      network: wallet.network,
    });
  }

  return Array.from(targets.values());
}

async function pollAddress(target: PollTarget): Promise<DetectedPayment[]> {
  const { address, currency, network } = target;

  if (network === "TRC20" && currency === "USDT") {
    return pollTron(address);
  }
  if (network === "ERC20") {
    if (!process.env.ETHERSCAN_API_KEY) {
      return [];
    }
    return pollEvm(address, currency, network, process.env.ETHERSCAN_API_KEY);
  }
  if (network === "BEP20" && process.env.BSCSCAN_API_KEY) {
    return pollEvm(address, currency, network, process.env.BSCSCAN_API_KEY, 56);
  }
  if (network === "Bitcoin") {
    return pollBitcoin(address);
  }
  if (network === "SPL" && currency === "USDT") {
    return pollSolanaSpl(address);
  }
  if (network === "Solana") {
    return pollSolana(address);
  }

  return [];
}

async function pollTron(address: string): Promise<DetectedPayment[]> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=30&only_to=true`;
  const res = await fetch(url, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) return [];

  const data = await res.json();
  const required = getRequiredConfirmations("USDT", "TRC20");

  return (data.data ?? [])
    .filter(
      (tx: Record<string, unknown>) =>
        addressesMatch(address, String(tx.to ?? ""), "TRC20") &&
        tx.token_info &&
        (tx.token_info as { address: string }).address === USDT_TRC20
    )
    .map((tx: Record<string, unknown>) => ({
      txHash: tx.transaction_id as string,
      amount: Number(tx.value) / 1e6,
      currency: "USDT",
      network: "TRC20",
      confirmations: tx.block_timestamp ? required : 0,
      depositAddress: address,
      blockTimestamp: tx.block_timestamp ? Number(tx.block_timestamp) : undefined,
    }));
}

async function pollEvm(
  address: string,
  currency: string,
  network: string,
  apiKey: string,
  chainId = 1
): Promise<DetectedPayment[]> {
  const contracts = TOKEN_CONTRACTS[network as keyof typeof TOKEN_CONTRACTS];
  const contract = contracts?.[currency];

  const url = buildEtherscanV2Url(apiKey, {
    module: "account",
    action: "tokentx",
    address,
    sort: "desc",
  }, chainId);

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== "1") return [];

  const decimals = getDecimals(currency, network);

  return (data.result ?? [])
    .filter(
      (tx: Record<string, string>) =>
        addressesMatch(address, tx.to ?? "", network) &&
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
  if (!validateWalletAddress(address, "Bitcoin")) {
    return [];
  }

  try {
    const txids = await fetchBlockstreamAddressTxIds(address);
    const tipHeight = await getBitcoinBlockHeight();
    const results: DetectedPayment[] = [];

    for (const txid of txids.slice(0, 10)) {
      try {
        const tx = await fetchBlockstreamTx(txid);
        const matching =
          tx.vout?.filter((o) => o.scriptpubkey_address === address) ?? [];
        const confirmations =
          tx.status.confirmed && tx.status.block_height
            ? Math.max(tipHeight - tx.status.block_height + 1, 1)
            : 0;

        if (matching.length === 0) continue;

        const totalSats = matching.reduce((sum, o) => sum + o.value, 0);
        results.push({
          txHash: tx.txid,
          amount: totalSats / 1e8,
          currency: "BTC",
          network: "Bitcoin",
          confirmations,
          depositAddress: address,
        });
      } catch (err) {
        logBlockstreamError(`tx ${txid}`, err);
      }
    }

    return results;
  } catch (err) {
    logBlockstreamError(`poll ${address}`, err);
    return [];
  }
}

let cachedBtcHeight = 0;
let btcHeightAt = 0;
async function getBitcoinBlockHeight(): Promise<number> {
  if (Date.now() - btcHeightAt < 60_000 && cachedBtcHeight) {
    return cachedBtcHeight;
  }

  try {
    cachedBtcHeight = await fetchBlockstreamTipHeight();
    btcHeightAt = Date.now();
  } catch (err) {
    logBlockstreamError("block height", err);
  }

  return cachedBtcHeight || 800000;
}

async function pollSolanaSpl(ownerAddress: string): Promise<DetectedPayment[]> {
  const { Connection, PublicKey } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");

  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const owner = new PublicKey(ownerAddress);
  const mint = new PublicKey(TOKEN_CONTRACTS.SPL.USDT);

  let ata: Awaited<ReturnType<typeof getAssociatedTokenAddress>>;
  try {
    ata = await getAssociatedTokenAddress(mint, owner);
  } catch {
    return [];
  }

  const sigs = await connection.getSignaturesForAddress(ata, { limit: 10 });
  const results: DetectedPayment[] = [];

  for (const sig of sigs.slice(0, 5)) {
    if (sig.err) continue;

    const tx = await connection.getParsedTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta || tx.meta.err) continue;

    const pre = tx.meta.preTokenBalances ?? [];
    const post = tx.meta.postTokenBalances ?? [];

    const preBal = pre.find(
      (b) => b.mint === TOKEN_CONTRACTS.SPL.USDT && b.owner === ownerAddress
    );
    const postBal = post.find(
      (b) => b.mint === TOKEN_CONTRACTS.SPL.USDT && b.owner === ownerAddress
    );

    const preAmount = preBal?.uiTokenAmount.uiAmount ?? 0;
    const postAmount = postBal?.uiTokenAmount.uiAmount ?? 0;
    const delta = postAmount - preAmount;

    if (delta <= 0) continue;

    results.push({
      txHash: sig.signature,
      amount: delta,
      currency: "USDT",
      network: "SPL",
      confirmations: sig.confirmationStatus === "finalized" ? 32 : 1,
      depositAddress: ownerAddress,
    });
  }

  return results;
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
  const targets = await getPollTargets();
  const detected: DetectedPayment[] = [];

  const needsEtherscan = targets.some((t) => t.network === "ERC20");
  if (needsEtherscan && !process.env.ETHERSCAN_API_KEY) {
    console.warn("[payment-poller] ETHERSCAN_API_KEY missing — ERC20 payments will not be detected");
  }

  for (const target of targets) {
    try {
      detected.push(...(await pollAddress(target)));
    } catch (err) {
      // Bitcoin errors are handled inside pollBitcoin with rate-limited logging
      if (target.network === "Bitcoin") continue;
      console.error(`Poll error ${target.network}/${target.currency} for ${target.address}:`, err);
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

    const required = getRequiredConfirmations(tx.currency, tx.network);
    let current = Number(tx.confirmations ?? 0);

    // Re-check on-chain for stuck TRC20 txs (TronGrid list omits a confirmed flag)
    if (current < required && tx.network === "TRC20" && tx.currency === "USDT") {
      const refreshed = await getTronTransferConfirmations(tx.txHash);
      if (refreshed > current) {
        current = refreshed;
        await db
          .update(transactions)
          .set({ confirmations: String(current), updatedAt: new Date() })
          .where(eq(transactions.id, tx.id));
      }
    }

    if (current >= required) {
      await completeTransaction(tx.id);
    }
  }
}

async function getTronTransferConfirmations(txHash: string): Promise<number> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const res = await fetch(
    `https://api.trongrid.io/v1/transactions/${txHash}/events?limit=1`,
    { headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {} }
  );
  if (res.ok) {
    const data = await res.json();
    const event = data.data?.[0] as { block_timestamp?: number } | undefined;
    if (event?.block_timestamp) {
      return getRequiredConfirmations("USDT", "TRC20");
    }
  }

  const infoRes = await fetch("https://api.trongrid.io/wallet/gettransactioninfobyid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "TRON-PRO-API-KEY": apiKey } : {}),
    },
    body: JSON.stringify({ value: txHash }),
  });
  if (!infoRes.ok) return 0;

  const info = (await infoRes.json()) as { blockNumber?: number; id?: string };
  return info.blockNumber || info.id ? getRequiredConfirmations("USDT", "TRC20") : 0;
}

async function getMerchantName(userId: string): Promise<string> {
  const [merchant] = await db
    .select({ businessName: users.businessName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return merchant?.businessName ?? "Unknown";
}

function paymentOccurredBeforeLink(
  payment: DetectedPayment,
  linkCreatedAt: Date
): boolean {
  if (!payment.blockTimestamp) return false;
  return payment.blockTimestamp < linkCreatedAt.getTime();
}

function amountMatchesLink(paymentAmount: number, expectedAmount: number): boolean {
  const tolerance = expectedAmount * 0.01;
  return paymentAmount >= expectedAmount - tolerance && paymentAmount <= expectedAmount + tolerance;
}

function classifyPaymentStatus(
  paymentAmount: number,
  expectedAmount: number
): "confirming" | "underpaid" | "overpaid" {
  const tolerance = expectedAmount * 0.01;
  if (paymentAmount > 0 && paymentAmount < expectedAmount - tolerance) return "underpaid";
  if (paymentAmount > expectedAmount + tolerance) return "overpaid";
  return "confirming";
}

/** Match an on-chain payment to the correct active payment link (amount + time aware). */
async function findMatchingPaymentLink(payment: DetectedPayment) {
  const links = await db
    .select()
    .from(paymentLinks)
    .where(
      and(
        eq(paymentLinks.depositAddress, payment.depositAddress),
        eq(paymentLinks.currency, payment.currency),
        eq(paymentLinks.network, payment.network),
        eq(paymentLinks.status, "active")
      )
    )
    .orderBy(desc(paymentLinks.createdAt));

  const now = new Date();
  const eligible = links.filter((link) => {
    if (link.expiry && link.expiry < now) return false;
    if (paymentOccurredBeforeLink(payment, link.createdAt)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const exactMatch = eligible.find((link) =>
    amountMatchesLink(payment.amount, Number(link.amount))
  );
  if (exactMatch) return exactMatch;

  // Do not attach unrelated amounts to the newest link (prevents false underpaid)
  return null;
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

      if (payment.confirmations >= getRequiredConfirmations(existing.currency, existing.network)) {
        await completeTransaction(existing.id);
      }
    }
    return;
  }

  const link = await findMatchingPaymentLink(payment);

  if (link) {
    const expectedAmount = Number(link.amount);
    const status = classifyPaymentStatus(payment.amount, expectedAmount);
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
        confirmations: String(payment.confirmations),
      })
      .returning();

    await dispatchWebhooks(link.userId, tx.id, "transaction.confirming");

    await notifyPaymentDetected({
      amount,
      currency: link.currency,
      network: link.network,
      merchantName: await getMerchantName(link.userId),
      txHash: payment.txHash,
      status,
    });

    if (
      (status === "confirming" || status === "overpaid") &&
      payment.confirmations >= getRequiredConfirmations(link.currency, link.network)
    ) {
      await completeTransaction(tx.id);
    }
    return;
  }

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(
      and(
        eq(wallets.address, payment.depositAddress),
        eq(wallets.currency, payment.currency),
        eq(wallets.network, payment.network),
        eq(wallets.walletType, "generated")
      )
    )
    .limit(1);

  if (!wallet || payment.amount <= 0) return;

  const { feeAmount, netAmount } = calculateFee(payment.amount);

  const [tx] = await db
    .insert(transactions)
    .values({
      userId: wallet.userId,
      amount: String(payment.amount),
      currency: payment.currency,
      network: payment.network,
      status: "confirming",
      txHash: payment.txHash,
      feeAmount: String(feeAmount),
      netAmount: String(netAmount),
      confirmations: String(payment.confirmations),
    })
    .returning();

  await dispatchWebhooks(wallet.userId, tx.id, "transaction.confirming");

  await notifyPaymentDetected({
    amount: payment.amount,
    currency: payment.currency,
    network: payment.network,
    merchantName: await getMerchantName(wallet.userId),
    txHash: payment.txHash,
    status: "confirming",
  });

  if (payment.confirmations >= getRequiredConfirmations(payment.currency, payment.network)) {
    await completeTransaction(tx.id);
  }
}

export async function completeTransaction(transactionId: string) {
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
      .where(
        and(
          eq(wallets.userId, tx.userId),
          eq(wallets.currency, tx.currency),
          eq(wallets.network, tx.network)
        )
      )
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
  } else if (wallet) {
    await queueSettlements(
      transactionId,
      tx.userId,
      tx.currency,
      tx.network,
      fee,
      net,
      null,
      wallet.id
    );
  }

  await dispatchWebhooks(tx.userId, transactionId, "transaction.completed");

  await notifyPaymentCompleted({
    amount: tx.amount,
    currency: tx.currency,
    network: tx.network,
    merchantName: await getMerchantName(tx.userId),
    feeAmount: fee,
    netAmount: net,
    txHash: tx.txHash,
  });
}
