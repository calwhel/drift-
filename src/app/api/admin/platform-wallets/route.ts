import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db, platformWallets } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { validateWalletAddress } from "@/lib/wallet/generate";
import { PLATFORM_WALLET_NETWORKS } from "@/lib/constants";

const walletSchema = z.object({
  currency: z.string().min(1).max(20),
  network: z.string().min(1).max(50),
  address: z.string().min(1),
  label: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  return NextResponse.json(
    { error: message },
    { status: message === "Forbidden" ? 403 : 401 }
  );
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const rows = await db.select().from(platformWallets).orderBy(asc(platformWallets.currency));

  return NextResponse.json({
    data: rows,
    supportedNetworks: PLATFORM_WALLET_NETWORKS,
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const body = await req.json();
  const parsed = walletSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { currency, network, address, label, isActive } = parsed.data;

  const supported = PLATFORM_WALLET_NETWORKS.some(
    (n) => n.currency === currency && n.network === network
  );
  if (!supported) {
    return NextResponse.json({ error: "Unsupported currency/network" }, { status: 400 });
  }

  const trimmedAddress = address.trim();
  if (!validateWalletAddress(trimmedAddress, network)) {
    return NextResponse.json(
      { error: `Invalid address format for ${currency} (${network})` },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(platformWallets)
    .where(and(eq(platformWallets.currency, currency), eq(platformWallets.network, network)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(platformWallets)
      .set({
        address: trimmedAddress,
        label: label ?? existing.label,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(platformWallets.id, existing.id))
      .returning();

    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(platformWallets)
    .values({
      currency,
      network,
      address: trimmedAddress,
      label,
      isActive: isActive ?? true,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
