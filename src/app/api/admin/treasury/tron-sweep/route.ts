import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
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
});

/** On-chain sweep USDT from a legacy TRC20 custodial wallet to an external address. */
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

    await fundTronAddressIfNeeded(wallet.address);
    const txHash = await broadcastFromPrivateKey(
      privateKey,
      data.to_address.trim(),
      sendAmount,
      wallet.currency,
      wallet.network
    );
    await reclaimTronTrxToGasWallet(privateKey, wallet.address);

    await logAudit(admin.id, "treasury.tron_sweep", "wallet", wallet.id, {
      toAddress: data.to_address,
      amount: sendAmount,
      txHash,
      userId: wallet.userId,
    });

    return NextResponse.json({
      ok: true,
      txHash,
      amount: sendAmount,
      currency: wallet.currency,
      message: `Sent ${sendAmount.toFixed(4)} ${wallet.currency} on-chain to ${data.to_address}`,
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
