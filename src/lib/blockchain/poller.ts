import { eq, and, desc, inArray, sql, isNull } from "drizzle-orm";
import { db, paymentLinks, transactions, wallets, users } from "../db";
import { calculateFee } from "../fees";
import { getRequiredConfirmations, getDecimals, getTokenContract, isStablecoin } from "../constants";
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
import { getEvmChain, isEvmUsdtNetwork } from "../evm/chains";
import { withEvmRpc } from "../evm/rpc";
import { pollEvmTokenTransfersToAddress } from "../evm/poll-deposits";
import { recordPollFailure, recordPollSuccess } from "./poll-health";

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

function pollTargetKey(address: string, currency: string, network: string) {
  return `${address}|${currency}|${network}`;
}

function addressesMatch(stored: string, observed: string, network: string): boolean {
  const a = stored.trim();
  const b = observed.trim();
  if (a === b) return true;
  if (network === "ERC20" || network === "BEP20" || isEvmUsdtNetwork(network)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

async function getPollTargets(): Promise<PollTarget[]> {
  const now = new Date();
  const allLinks = await db.select().from(paymentLinks);
  const activeLinks = allLinks.filter((l) => l.status === "active");
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

  // Active checkout addresses
  for (const link of validLinks) {
    if (link.network === "ERC20") continue;
    targets.set(pollTargetKey(link.depositAddress, link.currency, link.network), {
      address: link.depositAddress,
      currency: link.currency,
      network: link.network,
    });
  }

  // Orphan deposit addresses (paid/expired links may still receive late payments)
  for (const link of allLinks) {
    if (link.network === "ERC20" || link.status === "active") continue;
    if (!link.depositAddress?.trim()) continue;
    targets.set(pollTargetKey(link.depositAddress, link.currency, link.network), {
      address: link.depositAddress,
      currency: link.currency,
      network: link.network,
    });
  }

  for (const wallet of generatedWallets) {
    if (wallet.network === "ERC20") continue;
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

  if (network === "TRC20" && isStablecoin(currency)) {
    return pollTron(address, currency);
  }
  if (network === "ERC20") {
    if (!process.env.ETHERSCAN_API_KEY) {
      return [];
    }
    return pollEvm(address, currency, network, process.env.ETHERSCAN_API_KEY);
  }
  if (isEvmUsdtNetwork(network) && isStablecoin(currency)) {
    const chain = getEvmChain(network);
    if (!chain) return [];
    return pollEvmTokenViaRpc(address, network, chain, currency);
  }
  if (network === "Bitcoin") {
    return pollBitcoin(address);
  }
  if (network === "SPL" && isStablecoin(currency)) {
    return pollSolanaSpl(address, currency);
  }
  if (network === "Solana") {
    return pollSolana(address);
  }

  return [];
}

async function pollTron(address: string, currency: string): Promise<DetectedPayment[]> {
  const tokenContract = getTokenContract(currency, "TRC20");
  if (!tokenContract) return [];

  const apiKey = process.env.TRONGRID_API_KEY;
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=30&only_to=true`;
  const res = await fetch(url, {
    headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {},
  });
  if (!res.ok) {
    const msg = `TronGrid API error ${res.status}`;
    console.warn(`[payment-poller] ${msg} for ${address}`);
    recordPollFailure("TRC20", currency, msg);
    return [];
  }

  recordPollSuccess("TRC20", currency);

  const data = await res.json();
  const required = getRequiredConfirmations(currency, "TRC20");

  return (data.data ?? [])
    .filter(
      (tx: Record<string, unknown>) =>
        addressesMatch(address, String(tx.to ?? ""), "TRC20") &&
        tx.token_info &&
        (tx.token_info as { address: string }).address === tokenContract
    )
    .map((tx: Record<string, unknown>) => ({
      txHash: tx.transaction_id as string,
      amount: Number(tx.value) / 1e6,
      currency,
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
  const contract = getTokenContract(currency, network);

  const url = buildEtherscanV2Url(apiKey, {
    module: "account",
    action: "tokentx",
    address,
    sort: "desc",
  }, chainId);

  const res = await fetch(url);
  if (!res.ok) {
    const msg = `Etherscan API error ${res.status}`;
    console.warn(`[payment-poller] ${msg} for ${network}/${address}`);
    recordPollFailure(network, currency, msg);
    return [];
  }
  const data = await res.json();
  if (data.status !== "1") {
    if (data.message && data.message !== "No transactions found") {
      const msg = `Etherscan ${network}: ${data.message}`;
      console.warn(`[payment-poller] ${msg} for ${address}`);
      recordPollFailure(network, currency, msg);
    }
    return [];
  }

  recordPollSuccess(network, currency);

  const decimals = getDecimals(currency, network);

  return (data.result ?? [])
    .filter(
      (tx: Record<string, string>) =>
        addressesMatch(address, tx.to ?? "", network) &&
        (!contract || tx.contractAddress?.toLowerCase() === contract.toLowerCase())
    )
    .slice(0, 50)
    .map((tx: Record<string, string>) => ({
      txHash: tx.hash,
      amount: Number(tx.value) / Math.pow(10, decimals),
      currency,
      network,
      confirmations: Number(tx.confirmations ?? 0),
      depositAddress: address,
    }));
}

async function pollEvmTokenViaRpc(
  address: string,
  network: string,
  chain: NonNullable<ReturnType<typeof getEvmChain>>,
  currency: string
): Promise<DetectedPayment[]> {
  try {
    const transfers = await pollEvmTokenTransfersToAddress(address, chain, currency);
    recordPollSuccess(network, currency);
    return transfers.map((t) => ({
      txHash: t.txHash,
      amount: t.amount,
      currency,
      network,
      confirmations: t.confirmations,
      depositAddress: address,
      blockTimestamp: t.blockTimestamp,
    }));
  } catch (rpcErr) {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (apiKey) {
      console.warn(
        `[payment-poller] RPC ${currency} poll failed for ${network}/${address}, trying Etherscan:`,
        rpcErr
      );
      return pollEvm(address, currency, network, apiKey, chain.chainId);
    }

    const msg = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);
    console.warn(`[payment-poller] RPC ${currency} poll failed for ${network}/${address}: ${msg}`);
    recordPollFailure(network, currency, msg);
    return [];
  }
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

  return cachedBtcHeight || 0;
}

async function pollSolanaSpl(ownerAddress: string, currency: string): Promise<DetectedPayment[]> {
  const mintAddress = getTokenContract(currency, "SPL");
  if (!mintAddress) return [];

  const { Connection, PublicKey } = await import("@solana/web3.js");
  const { getAssociatedTokenAddress } = await import("@solana/spl-token");

  const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpc, "confirmed");
  const owner = new PublicKey(ownerAddress);
  const mint = new PublicKey(mintAddress);

  let ata: Awaited<ReturnType<typeof getAssociatedTokenAddress>>;
  try {
    ata = await getAssociatedTokenAddress(mint, owner);
  } catch {
    return [];
  }

  let sigs;
  try {
    sigs = await connection.getSignaturesForAddress(ata, { limit: 10 });
  } catch (err) {
    console.warn(`[payment-poller] Solana RPC error for ${ownerAddress}:`, err);
    return [];
  }
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
      (b) => b.mint === mintAddress && b.owner === ownerAddress
    );
    const postBal = post.find(
      (b) => b.mint === mintAddress && b.owner === ownerAddress
    );

    const preAmount = preBal?.uiTokenAmount.uiAmount ?? 0;
    const postAmount = postBal?.uiTokenAmount.uiAmount ?? 0;
    const delta = postAmount - preAmount;

    if (delta <= 0) continue;

    results.push({
      txHash: sig.signature,
      amount: delta,
      currency,
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

  const needsLegacyEtherscan = targets.some((t) => t.network === "ERC20");
  if (needsLegacyEtherscan && !process.env.ETHERSCAN_API_KEY) {
    console.warn(
      "[payment-poller] ETHERSCAN_API_KEY missing — legacy ERC20 token polling disabled (USDT EVM chains use RPC)"
    );
  }

  for (const target of targets) {
    try {
      const found = await pollAddress(target);
      detected.push(...found);
      if (found.length > 0) {
        recordPollSuccess(target.network, target.currency);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (target.network !== "Bitcoin") {
        console.error(`Poll error ${target.network}/${target.currency} for ${target.address}:`, err);
        recordPollFailure(target.network, target.currency, msg);
      }
    }
  }

  for (const payment of detected) {
    await processDetectedPayment(payment);
  }

  await updateConfirmingTransactions();

  return detected.length;
}

async function updateConfirmingTransactions() {
  const open = await db
    .select()
    .from(transactions)
    .where(inArray(transactions.status, ["confirming", "underpaid", "overpaid"]));

  for (const tx of open) {
    if (!tx.txHash) continue;

    const required = getRequiredConfirmations(tx.currency, tx.network);
    let current = Number(tx.confirmations ?? 0);

    if (current < required) {
      const refreshed = await refreshTransactionConfirmations(
        tx.txHash,
        tx.currency,
        tx.network
      );
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

async function refreshTransactionConfirmations(
  txHash: string,
  currency: string,
  network: string
): Promise<number> {
  const required = getRequiredConfirmations(currency, network);

  if (network === "TRC20" && isStablecoin(currency)) {
    return getTronTransferConfirmations(txHash, currency);
  }

  if (isEvmUsdtNetwork(network) && isStablecoin(currency)) {
    const chain = getEvmChain(network);
    if (!chain) return 0;
    try {
      return await withEvmRpc(chain, async (provider) => {
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) return 0;
        const block = await provider.getBlockNumber();
        return Math.max(block - receipt.blockNumber + 1, 1);
      });
    } catch {
      return 0;
    }
  }

  if (network === "SPL" && isStablecoin(currency)) {
    try {
      const { Connection } = await import("@solana/web3.js");
      const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpc, "confirmed");
      const statuses = await connection.getSignatureStatuses([txHash]);
      const status = statuses.value[0];
      if (status?.confirmationStatus === "finalized") return required;
      if (status?.confirmationStatus === "confirmed") return Math.min(required, 32);
      return status?.confirmations ?? 0;
    } catch {
      return 0;
    }
  }

  if (network === "Bitcoin" && currency === "BTC") {
    try {
      const tx = await fetchBlockstreamTx(txHash);
      if (!tx.status.confirmed || !tx.status.block_height) return 0;
      const tip = await getBitcoinBlockHeight();
      if (!tip) return 0;
      return Math.max(tip - tx.status.block_height + 1, 1);
    } catch {
      return 0;
    }
  }

  return 0;
}

async function getTronTransferConfirmations(txHash: string, currency: string): Promise<number> {
  const apiKey = process.env.TRONGRID_API_KEY;
  const res = await fetch(
    `https://api.trongrid.io/v1/transactions/${txHash}/events?limit=1`,
    { headers: apiKey ? { "TRON-PRO-API-KEY": apiKey } : {} }
  );
  if (res.ok) {
    const data = await res.json();
    const event = data.data?.[0] as { block_timestamp?: number } | undefined;
    if (event?.block_timestamp) {
      return getRequiredConfirmations(currency, "TRC20");
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
  return info.blockNumber || info.id ? getRequiredConfirmations(currency, "TRC20") : 0;
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

  // Reject ambiguous matches when multiple active links share an address
  if (payment.amount > 0 && eligible.length === 1) {
    return eligible[0];
  }

  if (eligible.length > 1) {
    console.warn(
      `[payment-poller] Ambiguous payment ${payment.amount} ${payment.currency} to ${payment.depositAddress} — ${eligible.length} active links; skipping auto-match`
    );
  }

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
    if (
      existing.status === "confirming" ||
      existing.status === "underpaid" ||
      existing.status === "overpaid"
    ) {
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
      .onConflictDoNothing({ target: transactions.txHash })
      .returning();

    if (!tx) return;

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
      (status === "confirming" || status === "underpaid" || status === "overpaid") &&
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
    .onConflictDoNothing({ target: transactions.txHash })
    .returning();

  if (!tx) return;

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
  type NotifyPayload = {
    transaction: typeof transactions.$inferSelect;
    net: number;
    fee: number;
    merchantName: string;
  };

  const notify = await db.transaction(async (dbTx): Promise<NotifyPayload | null> => {
    const [statusUpdated] = await dbTx
      .update(transactions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(
        and(
          eq(transactions.id, transactionId),
          inArray(transactions.status, ["confirming", "underpaid", "overpaid", "pending"])
        )
      )
      .returning();

    let txRow = statusUpdated ?? null;

    if (!txRow) {
      const [existing] = await dbTx
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);
      if (!existing || existing.status !== "completed" || existing.balanceCreditedAt) {
        return null;
      }
      txRow = existing;
    }

    const [credited] = await dbTx
      .update(transactions)
      .set({ balanceCreditedAt: new Date() })
      .where(and(eq(transactions.id, transactionId), isNull(transactions.balanceCreditedAt)))
      .returning();

    if (!credited) return null;

    const net = Number(credited.netAmount ?? 0);
    const fee = Number(credited.feeAmount ?? 0);

    let wallet: (typeof wallets.$inferSelect) | null = null;
    let linkDerivationIndex: number | null = null;
    let linkWalletId: string | null = null;

    if (credited.paymentLinkId) {
      const [link] = await dbTx
        .select()
        .from(paymentLinks)
        .where(eq(paymentLinks.id, credited.paymentLinkId))
        .limit(1);

      if (link) {
        linkDerivationIndex = link.derivationIndex;
        linkWalletId = link.walletId;
        if (link.walletId) {
          const [w] = await dbTx.select().from(wallets).where(eq(wallets.id, link.walletId)).limit(1);
          wallet = w ?? null;
        }

        await dbTx
          .update(paymentLinks)
          .set({ status: "paid", paidAt: new Date() })
          .where(eq(paymentLinks.id, link.id));
      }
    }

    if (!wallet) {
      const [w] = await dbTx
        .select()
        .from(wallets)
        .where(
          and(
            eq(wallets.userId, credited.userId),
            eq(wallets.currency, credited.currency),
            eq(wallets.network, credited.network)
          )
        )
        .limit(1);
      wallet = w ?? null;
    }

    if (wallet && net > 0) {
      await dbTx
        .update(wallets)
        .set({ balance: sql`${wallets.balance}::numeric + ${String(net)}` })
        .where(eq(wallets.id, wallet.id));
    }

    if (credited.paymentLinkId) {
      await queueSettlements(
        transactionId,
        credited.userId,
        credited.currency,
        credited.network,
        fee,
        net,
        linkDerivationIndex,
        linkWalletId,
        dbTx
      );
    } else if (wallet) {
      await queueSettlements(
        transactionId,
        credited.userId,
        credited.currency,
        credited.network,
        fee,
        net,
        null,
        wallet.id,
        dbTx
      );
    }

    const [merchant] = await dbTx
      .select({ businessName: users.businessName })
      .from(users)
      .where(eq(users.id, credited.userId))
      .limit(1);

    return {
      transaction: credited,
      net,
      fee,
      merchantName: merchant?.businessName ?? "Unknown",
    };
  });

  if (!notify) return;

  await dispatchWebhooks(notify.transaction.userId, transactionId, "transaction.completed");

  await notifyPaymentCompleted({
    amount: notify.transaction.amount,
    currency: notify.transaction.currency,
    network: notify.transaction.network,
    merchantName: notify.merchantName,
    feeAmount: notify.fee,
    netAmount: notify.net,
    txHash: notify.transaction.txHash,
  });
}
