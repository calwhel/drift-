import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, paymentLinks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { getHoldingAddress, NETWORKS, SupportedCurrency } from "@/lib/constants";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string(),
  network: z.string().optional(),
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
    const network =
      data.network ??
      NETWORKS[currency as SupportedCurrency]?.network ??
      "TRC20";

    let depositAddress: string;
    try {
      depositAddress = getHoldingAddress(currency, network);
    } catch {
      depositAddress = process.env.DEFAULT_HOLDING_WALLET ?? "TPa7x6h9Q8mR2ygJ6K1b8v5d3f9a2e1c7";
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
        depositAddress,
        status: "active",
      })
      .returning();

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
