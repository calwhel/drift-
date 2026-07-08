import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withdrawals } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { refundWithdrawalById } from "@/lib/wallet/withdraw";
import { logAudit } from "@/lib/audit";

function authError(err: unknown) {
  const message = err instanceof Error ? err.message : "Unauthorized";
  return NextResponse.json(
    { error: message },
    { status: message === "Forbidden" ? 403 : 401 }
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();
    const refunded = await refundWithdrawalById(params.id);

    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, params.id))
      .limit(1);

    await logAudit(admin.id, "withdrawal.refund", "withdrawal", params.id, {
      refunded,
      userId: withdrawal?.userId,
    });

    if (refunded <= 0) {
      return NextResponse.json(
        {
          error:
            "No refund applied — withdrawal may already be refunded, completed, or missing wallet link.",
          refunded: 0,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      refunded,
      withdrawal,
      message: `Restored ${refunded} to merchant ledger balance.`,
    });
  } catch (err) {
    if (err instanceof Error && (err.message === "Forbidden" || err.message === "Unauthorized")) {
      return authError(err);
    }
    const message = err instanceof Error ? err.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
