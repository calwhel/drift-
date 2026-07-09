import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionAuth } from "@/lib/api-auth";
import {
  convertWalletBalance,
  listConversionsForUser,
  listSupportedConversionTargets,
  quoteConversion,
  validateConversionPair,
  assertConversionOnChainSafe,
} from "@/lib/wallet/conversion";
import { db, wallets } from "@/lib/db";
import { eq, and } from "drizzle-orm";

const createSchema = z.object({
  from_wallet_id: z.string().uuid(),
  to_wallet_id: z.string().uuid(),
  amount: z.number().positive(),
});

export async function GET(req: NextRequest) {
  const auth = await requireSessionAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transfers = await listConversionsForUser(auth.userId);
  return NextResponse.json({
    transfers,
    targets: listSupportedConversionTargets(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSessionAuth(req);
    if (!auth) {
      return NextResponse.json(
        { error: "Conversions require a logged-in session — API keys cannot create conversions." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const { transfer, quote } = await convertWalletBalance({
      userId: auth.userId,
      fromWalletId: data.from_wallet_id,
      toWalletId: data.to_wallet_id,
      amount: data.amount,
      createdBy: "user",
    });

    return NextResponse.json({ transfer, quote }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Preview quote without executing */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireSessionAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = createSchema.parse(body);

    const [fromWallet, toWallet] = await Promise.all([
      db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, data.from_wallet_id), eq(wallets.userId, auth.userId)))
        .limit(1),
      db
        .select()
        .from(wallets)
        .where(and(eq(wallets.id, data.to_wallet_id), eq(wallets.userId, auth.userId)))
        .limit(1),
    ]);

    if (!fromWallet[0] || !toWallet[0]) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    validateConversionPair(fromWallet[0], toWallet[0], auth.userId);
    await assertConversionOnChainSafe(fromWallet[0], toWallet[0], data.amount);

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
