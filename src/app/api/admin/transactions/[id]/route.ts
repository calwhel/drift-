import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, transactions } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { adminCompleteTransaction, cancelTransaction } from "@/lib/transactions/admin-actions";

const bodySchema = z.object({
  action: z.enum(["cancel", "complete"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = bodySchema.parse(await req.json());

    if (body.action === "cancel") {
      await cancelTransaction(params.id);
      return NextResponse.json({ ok: true, status: "failed" });
    }

    await adminCompleteTransaction(params.id);
    const [tx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, params.id))
      .limit(1);

    return NextResponse.json({ ok: true, status: tx?.status ?? "completed" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(", ") }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Action failed";
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
