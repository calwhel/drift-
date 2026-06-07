import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, subscriptions, paymentLinks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { deriveDepositAddress, getNextDerivationIndex } from "@/lib/wallet/derive";
import { NETWORKS, SupportedCurrency } from "@/lib/constants";

const createSchema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().optional(),
  plan_name: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USDT"),
  interval: z.enum(["week", "month", "year"]).default("month"),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, auth.userId))
    .orderBy(desc(subscriptions.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const currency = data.currency.toUpperCase();
    const network = NETWORKS[currency as SupportedCurrency]?.network ?? "TRC20";

    const derivationIndex = await getNextDerivationIndex();
    let depositAddress: string;
    try {
      depositAddress = deriveDepositAddress(derivationIndex, currency, network);
    } catch {
      const { getHoldingAddress } = await import("@/lib/constants");
      depositAddress = getHoldingAddress(currency, network);
    }
    const shortCode = nanoid(10);

    const now = new Date();
    const periodEnd = new Date(now);
    if (data.interval === "week") periodEnd.setDate(periodEnd.getDate() + 7);
    else if (data.interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [link] = await db
      .insert(paymentLinks)
      .values({
        userId: auth.userId,
        title: data.plan_name,
        description: `Subscription: ${data.interval}ly`,
        amount: String(data.amount),
        currency,
        network,
        shortCode,
        depositAddress,
        derivationIndex,
        status: "active",
        expiry: periodEnd,
      })
      .returning();

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId: auth.userId,
        customerEmail: data.customer_email,
        customerName: data.customer_name,
        planName: data.plan_name,
        amount: String(data.amount),
        currency,
        interval: data.interval,
        paymentLinkId: link.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: "active",
      })
      .returning();

    return NextResponse.json(
      {
        ...sub,
        payment_link: `/pay/${link.shortCode}`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
