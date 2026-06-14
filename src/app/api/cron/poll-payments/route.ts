import { NextRequest, NextResponse } from "next/server";
import { pollAllNetworks } from "@/lib/blockchain/poller";
import { processPendingWebhooks } from "@/lib/webhooks";
import { processPendingSettlements } from "@/lib/wallet/settlement";
import { processPendingWithdrawals } from "@/lib/wallet/withdraw";
import { processSubscriptionPastDue } from "@/lib/subscriptions/billing";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pastDue = await processSubscriptionPastDue();
    const detected = await pollAllNetworks();
    const settlements = await processPendingSettlements();
    const withdrawalsProcessed = await processPendingWithdrawals();
    await processPendingWebhooks();

    return NextResponse.json({
      ok: true,
      pastDue,
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
