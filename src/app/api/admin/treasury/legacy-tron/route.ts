import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, wallets, users } from "@/lib/db";
import { fetchOnChainBalance } from "@/lib/blockchain/balances";
import { getTronGasWalletStatus } from "@/lib/wallet/gas-wallet";

/** List all legacy TRC20 wallets with ledger + on-chain balances for admin exit. */
export async function GET() {
  try {
    await requireAdmin();

    const tronWallets = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        currency: wallets.currency,
        network: wallets.network,
        address: wallets.address,
        balance: wallets.balance,
        walletType: wallets.walletType,
        label: wallets.label,
        userEmail: users.email,
      })
      .from(wallets)
      .innerJoin(users, eq(wallets.userId, users.id))
      .where(eq(wallets.network, "TRC20"));

    const enriched = await Promise.all(
      tronWallets.map(async (w) => {
        const onChain = await fetchOnChainBalance(w.address, w.currency, w.network);
        return {
          ...w,
          ledgerBalance: Number(w.balance),
          onChainBalance: onChain.amount,
          onChainError: onChain.error,
          nativeGas: onChain.nativeGas,
        };
      })
    );

    const gas = await getTronGasWalletStatus();

    return NextResponse.json({
      wallets: enriched,
      gasWallet: gas,
      message:
        "Tron is retired for new merchants. Convert ledger balances via Conversions, or on-chain sweep to an external wallet.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }
}
