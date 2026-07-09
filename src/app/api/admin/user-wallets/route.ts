import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, wallets } from "@/lib/db";
import { isCustodialWallet } from "@/lib/wallet/conversion";
import {
  isMerchantNetworkEnabled,
  disabledNetworkMessage,
  isLegacyTronNetwork,
} from "@/lib/constants";
import { generateWalletForNetwork, validateWalletAddress } from "@/lib/wallet/generate";
import { logAudit } from "@/lib/audit";

/** List merchant wallets for admin conversions (includes legacy TRC20). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const userId = req.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: wallets.id,
        currency: wallets.currency,
        network: wallets.network,
        balance: wallets.balance,
        walletType: wallets.walletType,
        label: wallets.label,
        address: wallets.address,
        encryptedPrivateKey: wallets.encryptedPrivateKey,
      })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .orderBy(sql`${wallets.balance}::numeric DESC`);

    const mapped = rows.map(({ encryptedPrivateKey, ...w }) => ({
      ...w,
      isCustodial: isCustodialWallet({
        walletType: w.walletType,
        encryptedPrivateKey,
      }),
      hasPrivateKey: Boolean(encryptedPrivateKey),
    }));

    return NextResponse.json({ wallets: mapped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }
}

const createSchema = z.object({
  user_id: z.string().uuid(),
  currency: z.string().min(1),
  network: z.string().min(1),
  label: z.string().max(100).optional(),
});

/** Admin: create a custodial wallet for a merchant (e.g. SPL destination for TRC20 exit). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const data = createSchema.parse(await req.json());

    if (isLegacyTronNetwork(data.network)) {
      return NextResponse.json(
        { error: "Cannot create new TRC20 wallets — Tron is retired." },
        { status: 400 }
      );
    }

    const disabled = disabledNetworkMessage(data.network);
    if (disabled) {
      return NextResponse.json({ error: disabled }, { status: 400 });
    }

    if (!isMerchantNetworkEnabled(data.currency, data.network)) {
      return NextResponse.json(
        { error: `${data.currency} on ${data.network} is not an active merchant network` },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, data.user_id),
          eq(wallets.currency, data.currency),
          eq(wallets.network, data.network)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Merchant already has a wallet for this currency/network", walletId: existing.id },
        { status: 409 }
      );
    }

    const generated = generateWalletForNetwork(data.currency, data.network);
    if (!validateWalletAddress(generated.address, data.network)) {
      return NextResponse.json({ error: "Generated address failed validation" }, { status: 500 });
    }

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId: data.user_id,
        currency: data.currency,
        network: data.network,
        address: generated.address,
        walletType: "generated",
        encryptedPrivateKey: generated.encryptedPrivateKey,
        label: data.label ?? `${data.currency} ${data.network}`,
        balance: "0",
      })
      .returning({
        id: wallets.id,
        currency: wallets.currency,
        network: wallets.network,
        address: wallets.address,
        balance: wallets.balance,
        walletType: wallets.walletType,
        label: wallets.label,
      });

    await logAudit(admin.id, "admin.wallet.create", "wallet", wallet.id, {
      userId: data.user_id,
      currency: data.currency,
      network: data.network,
    });

    return NextResponse.json({ wallet, isCustodial: true, hasPrivateKey: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to create wallet";
    const status =
      message === "Forbidden" || message === "Unauthorized"
        ? message === "Forbidden"
          ? 403
          : 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
