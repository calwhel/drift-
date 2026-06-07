import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, wallets } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const userWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, user.id));

    const totalBalance = userWallets.reduce((s, w) => s + Number(w.balance), 0);

    return NextResponse.json({ wallets: userWallets, totalBalance });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
