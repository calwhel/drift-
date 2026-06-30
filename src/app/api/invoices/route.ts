import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, invoices, invoiceItems, paymentLinks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { deriveDepositAddress, getNextDerivationIndex } from "@/lib/wallet/derive";
import { getWalletForCurrencyAndNetwork } from "@/lib/wallet/helpers";
import { defaultNetworkForCurrency } from "@/lib/constants";

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive().default(1),
  unit_price: z.number().positive(),
});

const createSchema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().optional(),
  currency: z.string().default("USDT"),
  network: z.string().optional(),
  due_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, auth.userId))
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const currency = data.currency.toUpperCase();
    const network = data.network ?? defaultNetworkForCurrency(currency);

    const subtotal = data.items.reduce(
      (s, i) => s + i.quantity * i.unit_price,
      0
    );

    const derivationIndex = await getNextDerivationIndex();
    let depositAddress: string;
    let walletId: string | null = null;

    const userWallet = await getWalletForCurrencyAndNetwork(auth.userId, currency, network);
    if (userWallet) {
      depositAddress = userWallet.address;
      walletId = userWallet.id;
    } else {
      try {
        depositAddress = deriveDepositAddress(derivationIndex, currency, network);
      } catch {
        const { getHoldingAddress } = await import("@/lib/constants");
        depositAddress = getHoldingAddress(currency, network);
      }
    }
    const shortCode = nanoid(10);

    const [link] = await db
      .insert(paymentLinks)
      .values({
        userId: auth.userId,
        title: `Invoice payment`,
        description: data.notes,
        amount: String(subtotal),
        currency,
        network,
        shortCode,
        depositAddress,
        derivationIndex: walletId ? null : derivationIndex,
        walletId,
        status: "active",
        expiry: data.due_date ? new Date(data.due_date) : null,
      })
      .returning();

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const [invoice] = await db
      .insert(invoices)
      .values({
        userId: auth.userId,
        invoiceNumber,
        customerEmail: data.customer_email,
        customerName: data.customer_name,
        currency,
        subtotal: String(subtotal),
        total: String(subtotal),
        dueDate: data.due_date ? new Date(data.due_date) : null,
        paymentLinkId: link.id,
        notes: data.notes,
        status: "sent",
      })
      .returning();

    for (const item of data.items) {
      await db.insert(invoiceItems).values({
        invoiceId: invoice.id,
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
        amount: String(item.quantity * item.unit_price),
      });
    }

    return NextResponse.json(
      {
        ...invoice,
        payment_link: `/pay/${link.shortCode}`,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
