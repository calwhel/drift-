import { NextRequest, NextResponse } from "next/server";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { db, wallets, withdrawals } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";
import { requireTwoFactorVerified } from "@/lib/auth";
import { MERCHANT_WALLET_NETWORKS, disabledNetworkMessage, isMerchantNetworkEnabled, type WalletType } from "@/lib/constants";
import { generateWalletForNetwork, validateWalletAddress } from "@/lib/wallet/generate";
import { logAudit } from "@/lib/audit";
import { fetchOnChainBalancesForWallets } from "@/lib/blockchain/balances";

const createSchema = z.object({
  type: z.enum(["connected", "generated"]),
  currency: z.string().min(1),
  network: z.string().min(1),
  address: z.string().optional(),
  label: z.string().max(100).optional(),
});

function isSupportedNetwork(currency: string, network: string) {
  return isMerchantNetworkEnabled(currency, network);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWallets = await db
      .select({
        id: wallets.id,
        currency: wallets.currency,
        network: wallets.network,
        address: wallets.address,
        balance: wallets.balance,
        walletType: wallets.walletType,
        label: wallets.label,
      })
      .from(wallets)
      .where(eq(wallets.userId, auth.userId));

    const withBalances = await fetchOnChainBalancesForWallets(userWallets);

    const enrichedWallets = withBalances.map(({ onChain, ...wallet }) => ({
      ...wallet,
      addressValid: validateWalletAddress(wallet.address, wallet.network),
      onChainBalance: onChain.amount,
      onChainError: onChain.error,
      nativeGasBalance: onChain.nativeGas?.amount ?? null,
      nativeGasSymbol: onChain.nativeGas?.symbol ?? null,
    }));

    const totalBalance = enrichedWallets.reduce((s, w) => s + Number(w.balance), 0);

    return NextResponse.json({
      wallets: enrichedWallets,
      totalBalance,
      supportedNetworks: MERCHANT_WALLET_NETWORKS,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTwoFactorVerified();
    const body = await req.json();
    const data = createSchema.parse(body);

    const currency = data.currency.toUpperCase();
    const network = data.network;

    if (!isSupportedNetwork(currency, network)) {
      const disabled = disabledNetworkMessage(network);
      return NextResponse.json(
        { error: disabled ?? "Unsupported currency/network" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(
        and(
          eq(wallets.userId, user.id),
          eq(wallets.currency, currency),
          eq(wallets.network, network)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: `You already have a wallet for ${currency} (${network}). Delete it first to replace.` },
        { status: 409 }
      );
    }

    const walletType = data.type as WalletType;
    const label =
      data.label ??
      MERCHANT_WALLET_NETWORKS.find((n) => n.currency === currency && n.network === network)?.label;

    if (walletType === "connected") {
      const address = data.address?.trim();
      if (!address) {
        return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
      }
      if (!validateWalletAddress(address, network)) {
        return NextResponse.json({ error: "Invalid address format for this network" }, { status: 400 });
      }

      const [wallet] = await db
        .insert(wallets)
        .values({
          userId: user.id,
          currency,
          network,
          address,
          walletType: "connected",
          label,
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

      await logAudit(user.id, "wallet.connected", "wallet", wallet.id);
      return NextResponse.json(wallet, { status: 201 });
    }

    const generated = generateWalletForNetwork(currency, network);
    if (!validateWalletAddress(generated.address, network)) {
      return NextResponse.json(
        { error: `Failed to generate a valid ${network} address. Please try again.` },
        { status: 500 }
      );
    }

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId: user.id,
        currency,
        network,
        address: generated.address,
        walletType: "generated",
        encryptedPrivateKey: generated.encryptedPrivateKey,
        label,
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

    await logAudit(user.id, "wallet.generated", "wallet", wallet.id);
    return NextResponse.json(wallet, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    console.error("Wallet create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create wallet" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireTwoFactorVerified();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Wallet id required" }, { status: 400 });
    }

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, id), eq(wallets.userId, user.id)))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (Number(wallet.balance) > 0) {
      return NextResponse.json(
        { error: "Cannot delete wallet with a positive balance. Withdraw funds first." },
        { status: 400 }
      );
    }

    const [pendingWithdrawal] = await db
      .select({ id: withdrawals.id })
      .from(withdrawals)
      .where(
        and(
          eq(withdrawals.walletId, id),
          or(eq(withdrawals.status, "pending"), eq(withdrawals.status, "processing"))
        )
      )
      .limit(1);

    if (pendingWithdrawal) {
      return NextResponse.json(
        {
          error:
            "Cannot delete wallet while a withdrawal is pending. Wait for it to finish or contact support.",
        },
        { status: 400 }
      );
    }

    await db.delete(wallets).where(eq(wallets.id, id));
    await logAudit(user.id, "wallet.deleted", "wallet", id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
