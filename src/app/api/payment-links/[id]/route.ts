import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, paymentLinks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [link] = await db
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.id, params.id), eq(paymentLinks.userId, auth.userId)))
    .limit(1);

  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...link,
    checkout_url: `/pay/${link.shortCode}`,
  });
}
