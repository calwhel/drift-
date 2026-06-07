import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db, withdrawals, wallets } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { NETWORKS, SupportedCurrency } from "@/lib/constants";

const createSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
  to_address: z.string().min(10),
  network: z.string().optional(),
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
    const currency = data.currency.toUpperCase();
    const network =
      data.network ?? NETWORKS[currency as SupportedCurrency]?.network ?? "TRC20";

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, auth.userId), eq(wallets.currency, currency)))
      .limit(1);

    if (!wallet || Number(wallet.balance) < data.amount) {
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
        amount: String(data.amount),
        currency,
        network,
        toAddress: data.to_address,
        status: "pending",
      })
      .returning();

    await logAudit(auth.userId, "withdrawal.created", "withdrawal", withdrawal.id);

    return NextResponse.json(withdrawal, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}
