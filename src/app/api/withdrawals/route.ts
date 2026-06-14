import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db, withdrawals, wallets } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { validateWalletAddress } from "@/lib/wallet/generate";

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

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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

    if (Number(wallet.balance) < data.amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const newBalance = Number(wallet.balance) - data.amount;
    await db
      .update(wallets)
      .set({ balance: String(newBalance) })
      .where(eq(wallets.id, wallet.id));

    const [withdrawal] = await db
      .insert(withdrawals)
      .values({
        userId: auth.userId,
        walletId: wallet.id,
        amount: String(data.amount),
        currency: wallet.currency,
        network: wallet.network,
        toAddress: data.to_address.trim(),
        status: "pending",
      })
      .returning();

    await logAudit(auth.userId, "withdrawal.created", "withdrawal", withdrawal.id);

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}
