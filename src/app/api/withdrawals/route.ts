import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db, withdrawals, wallets, users } from "@/lib/db";
import { authenticateRequest, requireSessionAuth } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { validateWalletAddress } from "@/lib/wallet/generate";
import {
  getWithdrawalNetworkFees,
  quoteWithdrawal,
  validateWithdrawalAmount,
} from "@/lib/wallet/withdrawal-fees";
import { getWithdrawableOnChain } from "@/lib/wallet/withdrawable";
import { notifyWithdrawalRequested } from "@/lib/telegram";
import { isLedgerOnlyStablecoin } from "@/lib/constants";

const createSchema = z.object({
  wallet_id: z.string().uuid(),
  amount: z.number().positive(),
  to_address: z.string().min(10),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, auth.userId))
    .orderBy(desc(withdrawals.createdAt));

  return NextResponse.json({
    withdrawals: rows,
    networkFees: getWithdrawalNetworkFees(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSessionAuth(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Withdrawals require a logged-in session with 2FA — API keys cannot create withdrawals." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, auth.userId)))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (wallet.walletType !== "generated") {
      return NextResponse.json(
        { error: "Withdrawals are only available for Drift-generated custodial wallets" },
        { status: 400 }
      );
    }

    if (!wallet.encryptedPrivateKey) {
      return NextResponse.json({ error: "Custodial wallet key not found" }, { status: 400 });
    }

    if (!validateWalletAddress(data.to_address, wallet.network)) {
      return NextResponse.json({ error: "Invalid destination address" }, { status: 400 });
    }

    const validationError = validateWithdrawalAmount(
      wallet.currency,
      wallet.network,
      data.amount,
      Number(wallet.balance)
    );
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { networkFee, netAmount } = quoteWithdrawal(
      wallet.currency,
      wallet.network,
      data.amount
    );

    if (isLedgerOnlyStablecoin(wallet.currency, wallet.network)) {
      try {
        const onChain = await getWithdrawableOnChain(
          auth.userId,
          wallet.address,
          wallet.currency,
          wallet.network
        );
        if (onChain.total + 0.000001 < netAmount) {
          const detail =
            onChain.unspendableDeposits > 0
              ? ` (${onChain.unspendableDeposits.toFixed(4)} ${wallet.currency} on unspendable deposit addresses excluded)`
              : "";
          return NextResponse.json(
            {
              error:
                `Not enough spendable ${wallet.currency} on-chain to send ${netAmount.toFixed(4)} ${wallet.currency} (found ${onChain.total.toFixed(4)} across wallet and deposit addresses${detail}). ` +
                "Wait for payments to confirm, then try again.",
            },
            { status: 400 }
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not verify on-chain balance";
        return NextResponse.json(
          { error: `${message}. Wait a minute and try again.` },
          { status: 503 }
        );
      }
    }

    const amountStr = String(data.amount);

    const withdrawal = await db.transaction(async (tx) => {
      const [debited] = await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance}::numeric - ${amountStr}` })
        .where(
          and(eq(wallets.id, wallet.id), sql`${wallets.balance}::numeric >= ${amountStr}`)
        )
        .returning();

      if (!debited) {
        throw new Error("Insufficient wallet balance");
      }

      const [row] = await tx
        .insert(withdrawals)
        .values({
          userId: auth.userId,
          walletId: wallet.id,
          amount: amountStr,
          feeAmount: String(networkFee),
          currency: wallet.currency,
          network: wallet.network,
          toAddress: data.to_address.trim(),
          status: "pending",
        })
        .returning();

      return row;
    });

    await logAudit(auth.userId, "withdrawal.created", "withdrawal", withdrawal.id);

    const [merchant] = await db
      .select({ businessName: users.businessName })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    notifyWithdrawalRequested({
      amount: String(netAmount),
      currency: withdrawal.currency,
      network: withdrawal.network,
      toAddress: withdrawal.toAddress,
      merchantName: merchant?.businessName,
    });

    return NextResponse.json(
      {
        ...withdrawal,
        net_amount: String(netAmount),
        network_fee: String(networkFee),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Insufficient wallet balance") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[withdrawals] POST failed:", err);
    const message = err instanceof Error ? err.message : "Withdrawal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
