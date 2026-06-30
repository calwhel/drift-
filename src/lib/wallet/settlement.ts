import { eq } from "drizzle-orm";
import { db, settlements, wallets } from "../db";
import { getPlatformFeeAddress } from "../platform-wallets";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";

const USDT_ERC20 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

export async function queueSettlements(
  transactionId: string,
  userId: string,
  currency: string,
  network: string,
  feeAmount: number,
  netAmount: number,
  derivationIndex: number | null,
  walletId: string | null
) {
  let sourceWallet: typeof wallets.$inferSelect | null = null;

  if (walletId) {
    const [w] = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    sourceWallet = w ?? null;
  }

  const merchantAddress = sourceWallet?.address;
  const feeWallet = await getPlatformFeeAddress(currency, network);
  const isGenerated = sourceWallet?.walletType === "generated";

  if (netAmount > 0 && merchantAddress && !merchantAddress.startsWith("pending_")) {
    if (isGenerated) {
      await db.insert(settlements).values({
        transactionId,
        userId,
        type: "merchant_payout",
        amount: String(netAmount),
        currency,
        network,
        toAddress: merchantAddress,
        walletId: sourceWallet!.id,
        fromDerivationIndex: derivationIndex,
        status: "ledger_settled",
      });
    } else {
      await db.insert(settlements).values({
        transactionId,
        userId,
        type: "merchant_payout",
        amount: String(netAmount),
        currency,
        network,
        toAddress: merchantAddress,
        walletId: sourceWallet?.id ?? null,
        fromDerivationIndex: derivationIndex,
        status: "ledger_settled",
      });
    }
  }

  if (feeAmount > 0 && feeWallet && isGenerated && sourceWallet?.encryptedPrivateKey) {
    await db.insert(settlements).values({
      transactionId,
      userId,
      type: "platform_fee",
      amount: String(feeAmount),
      currency,
      network,
      toAddress: feeWallet,
      walletId: sourceWallet.id,
      fromDerivationIndex: derivationIndex,
      status: "pending",
    });
  } else if (feeAmount > 0 && feeWallet && derivationIndex != null) {
    await db.insert(settlements).values({
      transactionId,
      userId,
      type: "platform_fee",
      amount: String(feeAmount),
      currency,
      network,
      toAddress: feeWallet,
      fromDerivationIndex: derivationIndex,
      status: "pending",
    });
  }
}

async function broadcastErc20FromIndex(
  fromIndex: number,
  toAddress: string,
  amount: number,
  rpcUrl: string,
  contract: string,
  decimals: number
): Promise<string> {
  const { Wallet, Contract, JsonRpcProvider, parseUnits } = await import("ethers");
  const privateKey = derivePrivateKey(fromIndex, "ERC20");
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  const contractInstance = new Contract(
    contract,
    ["function transfer(address to, uint256 amount) returns (bool)"],
    signer
  );
  const tx = await contractInstance.transfer(
    toAddress,
    parseUnits(amount.toFixed(decimals), decimals)
  );
  const receipt = await tx.wait();
  return receipt.hash as string;
}

export async function processPendingSettlements(): Promise<number> {
  const pending = await db
    .select()
    .from(settlements)
    .where(eq(settlements.status, "pending"));

  let processed = 0;

  for (const settlement of pending) {
    try {
      let txHash: string | null = null;

      if (settlement.walletId) {
        const [wallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.id, settlement.walletId))
          .limit(1);

        const privateKey = getPrivateKeyFromWallet(wallet?.encryptedPrivateKey ?? null);
        if (!privateKey) {
          await db
            .update(settlements)
            .set({ status: "failed", error: "Missing custodial wallet key" })
            .where(eq(settlements.id, settlement.id));
          continue;
        }

        txHash = await broadcastFromPrivateKey(
          privateKey,
          settlement.toAddress,
          Number(settlement.amount),
          settlement.currency,
          settlement.network
        );
      } else if (
        settlement.network === "ERC20" &&
        settlement.currency === "USDC" &&
        process.env.ETH_RPC_URL &&
        settlement.fromDerivationIndex != null
      ) {
        txHash = await broadcastErc20FromIndex(
          settlement.fromDerivationIndex,
          settlement.toAddress,
          Number(settlement.amount),
          process.env.ETH_RPC_URL,
          "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          6
        );
      } else if (
        settlement.network === "ERC20" &&
        settlement.currency === "USDT" &&
        process.env.ETH_RPC_URL &&
        settlement.fromDerivationIndex != null
      ) {
        txHash = await broadcastErc20FromIndex(
          settlement.fromDerivationIndex,
          settlement.toAddress,
          Number(settlement.amount),
          process.env.ETH_RPC_URL,
          USDT_ERC20,
          6
        );
      } else if (
        settlement.network === "TRC20" &&
        settlement.currency === "USDT" &&
        settlement.fromDerivationIndex != null
      ) {
        const privateKey = derivePrivateKey(settlement.fromDerivationIndex, "TRC20");
        txHash = await broadcastFromPrivateKey(
          privateKey,
          settlement.toAddress,
          Number(settlement.amount),
          settlement.currency,
          settlement.network
        );
      } else if (
        settlement.network === "SPL" &&
        settlement.currency === "USDT" &&
        settlement.fromDerivationIndex != null
      ) {
        const privateKey = derivePrivateKey(settlement.fromDerivationIndex, "SPL");
        txHash = await broadcastFromPrivateKey(
          privateKey,
          settlement.toAddress,
          Number(settlement.amount),
          settlement.currency,
          settlement.network
        );
      } else if (settlement.network === "TRC20") {
        await db
          .update(settlements)
          .set({
            status: "queued",
            error: "TRC20 fee sweep requires a custodial wallet or derivation index",
          })
          .where(eq(settlements.id, settlement.id));
        continue;
      } else {
        await db
          .update(settlements)
          .set({
            status: "queued",
            error: `Broadcast not configured for ${settlement.network}/${settlement.currency}`,
          })
          .where(eq(settlements.id, settlement.id));
        continue;
      }

      await db
        .update(settlements)
        .set({ status: "completed", txHash, completedAt: new Date() })
        .where(eq(settlements.id, settlement.id));
      processed++;
    } catch (err) {
      await db
        .update(settlements)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : "Settlement failed",
        })
        .where(eq(settlements.id, settlement.id));
    }
  }

  return processed;
}
