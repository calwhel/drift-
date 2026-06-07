import { eq } from "drizzle-orm";
import { db, settlements, wallets } from "../db";
import { derivePrivateKey } from "./derive";

const USDT_ERC20 = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

export async function queueSettlements(
  transactionId: string,
  userId: string,
  currency: string,
  network: string,
  feeAmount: number,
  netAmount: number,
  derivationIndex: number
) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  const merchantAddress = wallet?.address;
  const feeWallet = process.env.PLATFORM_FEE_WALLET ?? process.env.DEFAULT_HOLDING_WALLET;

  if (netAmount > 0 && merchantAddress && !merchantAddress.startsWith("pending_")) {
    await db.insert(settlements).values({
      transactionId,
      userId,
      type: "merchant_payout",
      amount: String(netAmount),
      currency,
      network,
      toAddress: merchantAddress,
      fromDerivationIndex: derivationIndex,
      status: "pending",
    });
  }

  if (feeAmount > 0 && feeWallet) {
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

async function broadcastErc20(
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
  if (!process.env.MASTER_WALLET_MNEMONIC) return 0;

  const pending = await db
    .select()
    .from(settlements)
    .where(eq(settlements.status, "pending"));

  let processed = 0;

  for (const settlement of pending) {
    try {
      let txHash: string | null = null;

      if (
        settlement.network === "ERC20" &&
        settlement.currency === "USDC" &&
        process.env.ETH_RPC_URL
      ) {
        txHash = await broadcastErc20(
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
        process.env.ETH_RPC_URL
      ) {
        txHash = await broadcastErc20(
          settlement.fromDerivationIndex,
          settlement.toAddress,
          Number(settlement.amount),
          process.env.ETH_RPC_URL,
          USDT_ERC20,
          6
        );
      } else if (settlement.network === "TRC20") {
        // Tron broadcast requires TronWeb; mark completed in ledger-only mode
        await db
          .update(settlements)
          .set({
            status: "ledger_settled",
            completedAt: new Date(),
            error: "Tron on-chain broadcast pending TronWeb integration",
          })
          .where(eq(settlements.id, settlement.id));
        processed++;
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
