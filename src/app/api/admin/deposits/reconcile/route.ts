import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { reconcileMerchantDeposits } from "@/lib/transactions/admin-actions";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim();

  if (!email) {
    return NextResponse.json({ error: "email query parameter required" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const deposits = await reconcileMerchantDeposits(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, businessName: user.businessName },
    deposits,
    summary: {
      addressCount: deposits.length,
      unmatchedCount: deposits.reduce((n, d) => n + d.unmatchedTransfers.length, 0),
    },
  });
}
