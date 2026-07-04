import { NextRequest, NextResponse } from "next/server";
import { retryWebhookDelivery } from "@/lib/webhooks";
import { authenticateRequest } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await retryWebhookDelivery(params.id, auth.userId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
