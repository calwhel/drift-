import { eq, or, and, sql } from "drizzle-orm";
import { db, settlements, wallets } from "../db";
import { getPlatformFeeAddress } from "../platform-wallets";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey, deriveDepositAddress } from "./derive";
import { fundTronAddressIfNeeded, getTronSourceAddress } from "./tron-gas";
import { fundEvmNativeIfNeeded, reclaimEvmNativeToGasWallet } from "../evm/gas";
import { notifyFeeSettlementFailed, notifyFeeSettlementSuccess } from "../telegram";
import { isUsdtLedgerOnly } from "../constants";
import { isEvmUsdtNetwork } from "../evm/chains";
import { verifyEvmTransactionSuccess } from "./tx-verify";

type DbClient = Pick<typeof db, "insert" | "select" | "update">;

const USDT_ERC20 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

export async function queueSettlements(
  transactionId: string,
  userId: string,
  currency: string,
  network: string,
  feeAmount: number,
  netAmount: number,
  derivationIndex: number | null,
  walletId: string | null,
  txClient: DbClient = db
) {
  let sourceWallet: typeof wallets.$inferSelect | null = null;

  if (walletId) {
    const [w] = await txClient.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    sourceWallet = w ?? null;
  }

  const merchantAddress = sourceWallet?.address;
  const feeWallet = await getPlatformFeeAddress(currency, network);
  const isGenerated = sourceWallet?.walletType === "generated";
  const ledgerOnly = isUsdtLedgerOnly(currency, network);

  const insertSettlement = async (values: typeof settlements.$inferInsert) => {
    await txClient
      .insert(settlements)
      .values(values)
      .onConflictDoNothing({ target: [settlements.transactionId, settlements.type] });
  };

  if (netAmount > 0 && merchantAddress && !merchantAddress.startsWith("pending_")) {
    if (isGenerated) {
      await insertSettlement({
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
      if (derivationIndex != null && netAmount > 0) {
        await insertSettlement({
          transactionId,
          userId,
          type: "merchant_payout",
          amount: String(netAmount),
          currency,
          network,
          toAddress: merchantAddress,
          walletId: sourceWallet?.id ?? null,
          fromDerivationIndex: derivationIndex,
          status: "pending",
        });
      } else {
        await insertSettlement({
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
  }

  if (feeAmount > 0 && ledgerOnly && feeWallet) {
    await insertSettlement({
      transactionId,
      userId,
      type: "platform_fee",
      amount: String(feeAmount),
      currency,
      network,
      toAddress: feeWallet,
      walletId: walletId,
      fromDerivationIndex: derivationIndex,
      status: "ledger_settled",
    });
  } else if (feeAmount > 0 && feeWallet && isGenerated && sourceWallet?.encryptedPrivateKey) {
    await insertSettlement({
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
    await insertSettlement({
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
  } else if (feeAmount > 0 && !feeWallet) {
    console.warn(
      `[settlement] No platform fee wallet for ${currency}/${network} — fee ${feeAmount} recorded in ledger only`
    );
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
    .where(
      or(
        eq(settlements.status, "pending"),
        and(
          eq(settlements.status, "failed"),
          eq(settlements.type, "platform_fee"),
          sql`${settlements.createdAt} > now() - interval '24 hours'`
        )
      )
    )
    .orderBy(
      sql`CASE WHEN ${settlements.type} = 'platform_fee' THEN 0 ELSE 1 END`,
      settlements.createdAt
    );

  let processed = 0;

  for (const settlement of pending) {
    const [claimed] = await db
      .update(settlements)
      .set({ status: "processing", error: null })
      .where(
        and(
          eq(settlements.id, settlement.id),
          or(eq(settlements.status, "pending"), eq(settlements.status, "failed"))
        )
      )
      .returning();

    if (!claimed) continue;

    try {
      if (claimed.txHash) {
        if (isEvmUsdtNetwork(claimed.network) && claimed.currency === "USDT") {
          await verifyEvmTransactionSuccess(claimed.txHash, claimed.network, 15_000);
        } else if (claimed.network === "TRC20" && claimed.currency === "USDT") {
          const { verifyTronTransactionSuccess } = await import("./tx-verify");
          await verifyTronTransactionSuccess(claimed.txHash, 15_000);
        }
        await db
          .update(settlements)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(settlements.id, claimed.id));
        processed++;
        continue;
      }

      let txHash: string | null = null;
      const amount = Number(claimed.amount);
      const fromIndex = claimed.fromDerivationIndex;

      if (claimed.network === "TRC20" && claimed.currency === "USDT") {
        const sourceAddress = getTronSourceAddress(
          fromIndex,
          claimed.currency,
          claimed.network,
          claimed.walletId
            ? (
                await db
                  .select({ address: wallets.address })
                  .from(wallets)
                  .where(eq(wallets.id, claimed.walletId))
                  .limit(1)
              )[0]?.address
            : null
        );
        if (sourceAddress) await fundTronAddressIfNeeded(sourceAddress);
      }

      if (isEvmUsdtNetwork(claimed.network) && claimed.currency === "USDT" && fromIndex != null) {
        const fromAddress = deriveDepositAddress(fromIndex, "USDT", claimed.network);
        await fundEvmNativeIfNeeded(claimed.network, fromAddress);
      }

      if (fromIndex != null) {
        const privateKey = derivePrivateKey(fromIndex, claimed.network);
        txHash = await broadcastFromPrivateKey(
          privateKey,
          claimed.toAddress,
          amount,
          claimed.currency,
          claimed.network
        );
        if (isEvmUsdtNetwork(claimed.network) && claimed.currency === "USDT") {
          const fromAddress = deriveDepositAddress(fromIndex, "USDT", claimed.network);
          await reclaimEvmNativeToGasWallet(claimed.network, privateKey, fromAddress);
        }
      } else if (claimed.walletId) {
        const [wallet] = await db
          .select()
          .from(wallets)
          .where(eq(wallets.id, claimed.walletId))
          .limit(1);

        const privateKey = getPrivateKeyFromWallet(wallet?.encryptedPrivateKey ?? null);
        if (!privateKey) {
          throw new Error("Missing custodial wallet key");
        }

        txHash = await broadcastFromPrivateKey(
          privateKey,
          claimed.toAddress,
          amount,
          claimed.currency,
          claimed.network
        );
      } else if (
        claimed.network === "ERC20" &&
        process.env.ETH_RPC_URL &&
        fromIndex != null
      ) {
        const contract =
          claimed.currency === "USDC"
            ? "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            : USDT_ERC20;
        const decimals = claimed.currency === "USDC" ? 6 : 6;
        txHash = await broadcastErc20FromIndex(
          fromIndex,
          claimed.toAddress,
          amount,
          process.env.ETH_RPC_URL,
          contract,
          decimals
        );
      } else {
        await db
          .update(settlements)
          .set({
            status: "queued",
            error: `Broadcast not configured for ${claimed.network}/${claimed.currency}`,
          })
          .where(eq(settlements.id, claimed.id));
        continue;
      }

      if (!txHash) throw new Error("Settlement broadcast returned no transaction id");

      await db
        .update(settlements)
        .set({ status: "completed", txHash, completedAt: new Date(), error: null })
        .where(eq(settlements.id, claimed.id));

      if (claimed.type === "platform_fee") {
        notifyFeeSettlementSuccess({
          network: claimed.network,
          amount: claimed.amount,
          currency: claimed.currency,
          txHash,
        });
      }
      processed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Settlement failed";
      await db
        .update(settlements)
        .set({ status: "failed", error: errorMessage })
        .where(eq(settlements.id, claimed.id));
      if (claimed.type === "platform_fee") {
        notifyFeeSettlementFailed({
          network: claimed.network,
          amount: claimed.amount,
          currency: claimed.currency,
          error: errorMessage,
        });
      }
    }
  }

  return processed;
}
