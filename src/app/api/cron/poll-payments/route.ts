import { NextResponse } from "next/server";
import { runPaymentPollCycle } from "@/lib/payment-poller";

/** Manual trigger — payment polling runs automatically via the internal poller. */
export async function GET() {
  const result = await runPaymentPollCycle();

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Poll failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
