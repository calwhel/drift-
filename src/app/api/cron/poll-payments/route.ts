import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { pollAllNetworks } from "@/lib/blockchain/poller";
import { processPendingWebhooks } from "@/lib/webhooks";
import { processPendingSettlements } from "@/lib/wallet/settlement";
import { processPendingWithdrawals } from "@/lib/wallet/withdraw";

function headerMatchesSecret(header: string | null, expected: string): boolean {
  if (!header) return false;
  const headerBuffer = Buffer.from(header);
  const expectedBuffer = Buffer.from(expected);
  if (headerBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(headerBuffer, expectedBuffer);
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (!headerMatchesSecret(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const detected = await pollAllNetworks();
    const settlements = await processPendingSettlements();
    const withdrawalsProcessed = await processPendingWithdrawals();
    await processPendingWebhooks();

    return NextResponse.json({
      ok: true,
      detected,
      settlements,
      withdrawals: withdrawalsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cron poll error:", err);
    return NextResponse.json({ error: "Poll failed" }, { status: 500 });
  }
}
