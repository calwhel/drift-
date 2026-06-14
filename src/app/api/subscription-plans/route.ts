import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, subscriptionPlans, wallets } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  wallet_id: z.string().uuid(),
  interval: z.enum(["week", "month", "year"]).default("month"),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.userId, auth.userId))
    .orderBy(desc(subscriptionPlans.createdAt));

  return NextResponse.json(
    plans.map((p) => ({
      ...p,
      subscribe_url: `/subscribe/${p.shortCode}`,
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const currency = data.currency.toUpperCase();

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, auth.userId)))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (wallet.currency !== currency) {
      return NextResponse.json(
        { error: "Wallet currency must match plan currency" },
        { status: 400 }
      );
    }

    const shortCode = nanoid(10);

    const [plan] = await db
      .insert(subscriptionPlans)
      .values({
        userId: auth.userId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        amount: String(data.amount),
        currency,
        network: wallet.network,
        interval: data.interval,
        shortCode,
        walletId: wallet.id,
        status: "active",
      })
      .returning();

    return NextResponse.json(
      {
        ...plan,
        subscribe_url: `/subscribe/${plan.shortCode}`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create subscription plan" }, { status: 500 });
  }
}
