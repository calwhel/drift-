import { eq } from "drizzle-orm";
import { db, settlements, wallets } from "../db";
import { getPlatformFeeAddress } from "../platform-wallets";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "./broadcast";
import { derivePrivateKey } from "./derive";
import { broadcastTrc20FromDerivationIndex, broadcastTrc20Usdt } from "./tron-broadcast";

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
  let sourceWallet: (typeof wallets.$inferSelect) | null = null;

  if (walletId) {
    const [w] = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    sourceWallet = w ?? null;
  }

  const merchantAddress = sourceWallet?.address;
  const feeWallet = await getPlatformFeeAddress(currency, network);
  const isGenerated = sourceWallet?.walletType === "generated";
  const hasDerivedDeposit = derivationIndex != null;

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
    } else if (hasDerivedDeposit) {
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
        status: "pending",
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

  if (feeAmount > 0 && feeWallet) {
    if (isGenerated && sourceWallet?.encryptedPrivateKey) {
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
    } else if (hasDerivedDeposit) {
      await db.insert(settlements).values({
        transactionId,
        userId,
        type: "platform_fee",
        amount: String(feeAmount),
        currency,
        network,
        toAddress: feeWallet,
        walletId: sourceWallet?.id ?? null,
        fromDerivationIndex: derivationIndex,
        status: "pending",
      });
    }
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

async function broadcastSettlement(settlement: typeof settlements.$inferSelect): Promise<string> {
  if (
    settlement.network === "TRC20" &&
    settlement.currency === "USDT" &&
    settlement.fromDerivationIndex != null
  ) {
    return broadcastTrc20FromDerivationIndex(
      settlement.fromDerivationIndex,
      settlement.toAddress,
      Number(settlement.amount)
    );
  }

  if (settlement.walletId) {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, settlement.walletId))
      .limit(1);

    const privateKey = getPrivateKeyFromWallet(wallet?.encryptedPrivateKey ?? null);
    if (!privateKey) {
      throw new Error("Missing custodial wallet key");
    }

    if (settlement.network === "TRC20" && settlement.currency === "USDT") {
      return broadcastTrc20Usdt(privateKey, settlement.toAddress, Number(settlement.amount));
    }

    return broadcastFromPrivateKey(
      privateKey,
      settlement.toAddress,
      Number(settlement.amount),
      settlement.currency,
      settlement.network
    );
  }

  if (
    settlement.network === "ERC20" &&
    settlement.currency === "USDC" &&
    process.env.ETH_RPC_URL &&
    settlement.fromDerivationIndex != null
  ) {
    return broadcastErc20FromIndex(
      settlement.fromDerivationIndex,
      settlement.toAddress,
      Number(settlement.amount),
      process.env.ETH_RPC_URL,
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      6
    );
  }

  if (
    settlement.network === "ERC20" &&
    settlement.currency === "USDT" &&
    process.env.ETH_RPC_URL &&
    settlement.fromDerivationIndex != null
  ) {
    return broadcastErc20FromIndex(
      settlement.fromDerivationIndex,
      settlement.toAddress,
      Number(settlement.amount),
      process.env.ETH_RPC_URL,
      USDT_ERC20,
      6
    );
  }

  throw new Error(`Broadcast not configured for ${settlement.network}/${settlement.currency}`);
}

export async function processPendingSettlements(): Promise<number> {
  const pending = await db
    .select()
    .from(settlements)
    .where(eq(settlements.status, "pending"));

  let processed = 0;

  for (const settlement of pending) {
    try {
      const txHash = await broadcastSettlement(settlement);

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
