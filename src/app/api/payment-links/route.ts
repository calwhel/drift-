import { NextRequest, NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, paymentLinks, wallets } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string(),
  network: z.string().optional(),
  wallet_id: z.string().uuid(),
  expiry: z.string().datetime().optional().nullable(),
  redirect_url: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.userId, auth.userId))
    .orderBy(desc(paymentLinks.createdAt));

  return NextResponse.json(links);
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
        { error: "Selected wallet currency does not match payment link currency" },
        { status: 400 }
      );
    }

    const network = data.network ?? wallet.network;
    if (wallet.network !== network) {
      return NextResponse.json(
        { error: "Selected wallet network does not match payment link network" },
        { status: 400 }
      );
    }

    const shortCode = nanoid(10);

    const [link] = await db
      .insert(paymentLinks)
      .values({
        userId: auth.userId,
        title: data.title,
        description: data.description,
        amount: String(data.amount),
        currency,
        network,
        expiry: data.expiry ? new Date(data.expiry) : null,
        redirectUrl: data.redirect_url,
        shortCode,
        depositAddress: wallet.address,
        walletId: wallet.id,
        derivationIndex: null,
        status: "active",
      })
      .returning();

    await logAudit(auth.userId, "payment_link.created", "payment_link", link.id);

    return NextResponse.json(
      {
        ...link,
        checkout_url: `/pay/${link.shortCode}`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
  }
}
