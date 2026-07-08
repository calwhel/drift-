import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, wallets } from "@/lib/db";

/** List custodial wallets for a merchant (admin conversions). */
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
      })
      .from(wallets)
      .where(eq(wallets.userId, userId));

    return NextResponse.json({ wallets: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }
}
