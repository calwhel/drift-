import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import {
  convertWalletBalance,
  quoteConversion,
  validateConversionPair,
  assertConversionOnChainSafe,
} from "@/lib/wallet/conversion";
import { db, wallets, ledgerTransfers, users } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  user_id: z.string().uuid(),
  from_wallet_id: z.string().uuid(),
  to_wallet_id: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().optional(),
  /** Allow cross-network convert even when source still has on-chain funds (treasury cleanup) */
  force: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        transfer: ledgerTransfers,
        userEmail: users.email,
      })
      .from(ledgerTransfers)
      .innerJoin(users, eq(ledgerTransfers.userId, users.id))
      .orderBy(desc(ledgerTransfers.createdAt))
      .limit(100);

    return NextResponse.json({ transfers: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const data = createSchema.parse(body);

    const { transfer, quote } = await convertWalletBalance({
      userId: data.user_id,
      fromWalletId: data.from_wallet_id,
      toWalletId: data.to_wallet_id,
      amount: data.amount,
      createdBy: "admin",
      adminUserId: admin.id,
      note: data.note,
      skipOnChainCheck: data.force === true,
    });

    await logAudit(admin.id, "admin.conversion", "ledger_transfer", transfer.id, {
      userId: data.user_id,
      quote,
      force: data.force === true,
    });

    return NextResponse.json({ transfer, quote }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Conversion failed";
    const status =
      message === "Forbidden" || message === "Unauthorized"
        ? message === "Forbidden"
          ? 403
          : 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const data = createSchema.parse(body);

    const [fromWallet, toWallet] = await Promise.all([
      db.select().from(wallets).where(eq(wallets.id, data.from_wallet_id)).limit(1),
      db.select().from(wallets).where(eq(wallets.id, data.to_wallet_id)).limit(1),
    ]);

    if (
      !fromWallet[0] ||
      !toWallet[0] ||
      fromWallet[0].userId !== data.user_id ||
      toWallet[0].userId !== data.user_id
    ) {
      return NextResponse.json({ error: "Wallet not found for user" }, { status: 404 });
    }

    validateConversionPair(fromWallet[0], toWallet[0], data.user_id);
    if (!data.force) {
      await assertConversionOnChainSafe(fromWallet[0], toWallet[0], data.amount);
    }

    const quote = quoteConversion(
      fromWallet[0].currency,
      fromWallet[0].network,
      toWallet[0].currency,
      toWallet[0].network,
      Math.round(data.amount * 1e6) / 1e6
    );

    return NextResponse.json({ quote });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Quote failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
