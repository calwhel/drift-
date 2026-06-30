import { NextRequest, NextResponse } from "next/server";
import { runPaymentPollCycle } from "@/lib/payment-poller";

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

/** Manual trigger — payment polling runs automatically via the internal poller. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runPaymentPollCycle();

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Poll failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
