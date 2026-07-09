import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, wallets } from "@/lib/db";
import { fetchOnChainBalance } from "@/lib/blockchain/balances";
import { broadcastFromPrivateKey, getPrivateKeyFromWallet } from "@/lib/wallet/broadcast";
import { fundTronAddressIfNeeded, reclaimTronTrxToGasWallet } from "@/lib/wallet/tron-gas";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  wallet_id: z.string().uuid(),
  to_address: z.string().min(10),
  amount: z.number().positive().optional(),
  /** Also debit ledger by the swept amount (keeps books in sync). Default true. */
  debit_ledger: z.boolean().optional().default(true),
});

/** On-chain sweep USDT/USDC from a legacy TRC20 custodial wallet to an external address. */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const data = schema.parse(await req.json());

    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, data.wallet_id))
      .limit(1);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }
    if (wallet.network !== "TRC20") {
      return NextResponse.json({ error: "Only legacy TRC20 wallets can be swept here" }, { status: 400 });
    }
    if (wallet.walletType !== "generated") {
      return NextResponse.json({ error: "Only custodial wallets can be swept" }, { status: 400 });
    }

    const privateKey = getPrivateKeyFromWallet(wallet.encryptedPrivateKey);
    if (!privateKey) {
      return NextResponse.json({ error: "Missing wallet private key" }, { status: 400 });
    }

    const onChain = await fetchOnChainBalance(wallet.address, wallet.currency, wallet.network);
    const available = onChain.amount ?? 0;
    const sendAmount = data.amount ?? available;

    if (sendAmount <= 0 || sendAmount > available + 0.000001) {
      return NextResponse.json(
        {
          error: `Insufficient on-chain ${wallet.currency} (have ${available.toFixed(4)}, requested ${sendAmount.toFixed(4)})`,
        },
        { status: 400 }
      );
    }

    const ledgerBalance = Number(wallet.balance);
    if (data.debit_ledger !== false && ledgerBalance + 0.000001 < sendAmount) {
      return NextResponse.json(
        {
          error:
            `Ledger balance (${ledgerBalance.toFixed(4)}) is less than sweep amount (${sendAmount.toFixed(4)}). ` +
            `Reduce the sweep amount, or convert/adjust ledger first. Pass debit_ledger=false only if you intentionally want on-chain-only exit.`,
        },
        { status: 400 }
      );
    }

    await fundTronAddressIfNeeded(wallet.address);
    const txHash = await broadcastFromPrivateKey(
      privateKey,
      data.to_address.trim(),
      sendAmount,
      wallet.currency,
      wallet.network
    );
    await reclaimTronTrxToGasWallet(privateKey, wallet.address);

    let ledgerDebited = 0;
    if (data.debit_ledger !== false) {
      const debit = Math.min(sendAmount, ledgerBalance);
      if (debit > 0) {
        await db
          .update(wallets)
          .set({
            balance: sql`GREATEST(0, ${wallets.balance}::numeric - ${String(debit)})`,
          })
          .where(eq(wallets.id, wallet.id));
        ledgerDebited = debit;
      }
    }

    await logAudit(admin.id, "treasury.tron_sweep", "wallet", wallet.id, {
      toAddress: data.to_address,
      amount: sendAmount,
      txHash,
      userId: wallet.userId,
      ledgerDebited,
    });

    return NextResponse.json({
      ok: true,
      txHash,
      amount: sendAmount,
      currency: wallet.currency,
      ledgerDebited,
      message: `Sent ${sendAmount.toFixed(4)} ${wallet.currency} on-chain to ${data.to_address}${
        ledgerDebited > 0 ? ` (ledger debited ${ledgerDebited.toFixed(4)})` : ""
      }`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Sweep failed";
    const status =
      message === "Forbidden" || message === "Unauthorized"
        ? message === "Forbidden"
          ? 403
          : 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
