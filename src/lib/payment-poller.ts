import { pollAllNetworks } from "@/lib/blockchain/poller";
import { processPendingWebhooks } from "@/lib/webhooks";
import { processPendingSettlements } from "@/lib/wallet/settlement";
import { processPendingWithdrawals } from "@/lib/wallet/withdraw";
import { processSubscriptionRenewals } from "@/lib/subscription-renewals";

const POLL_INTERVAL_MS = 60_000;

const globalForPoller = globalThis as typeof globalThis & {
  __driftPaymentPollerStarted?: boolean;
};

let cycleRunning = false;

export interface PaymentPollResult {
  ok: boolean;
  detected: number;
  settlements: number;
  withdrawals: number;
  subscriptionRenewals: number;
  timestamp: string;
  error?: string;
}

export async function runPaymentPollCycle(): Promise<PaymentPollResult> {
  const timestamp = new Date().toISOString();

  if (cycleRunning) {
    return {
      ok: false,
      detected: 0,
      settlements: 0,
      withdrawals: 0,
      subscriptionRenewals: 0,
      timestamp,
      error: "Poll cycle already in progress",
    };
  }

  cycleRunning = true;
  try {
    const detected = await pollAllNetworks();
    const settlements = await processPendingSettlements();
    const withdrawalsProcessed = await processPendingWithdrawals();
    const subscriptionRenewals = await processSubscriptionRenewals();
    await processPendingWebhooks();

    return {
      ok: true,
      detected,
      settlements,
      withdrawals: withdrawalsProcessed,
      subscriptionRenewals,
      timestamp,
    };
  } catch (err) {
    console.error("[payment-poller] Cycle failed:", err);
    return {
      ok: false,
      detected: 0,
      settlements: 0,
      withdrawals: 0,
      subscriptionRenewals: 0,
      timestamp,
      error: err instanceof Error ? err.message : "Poll failed",
    };
  } finally {
    cycleRunning = false;
  }
}

export function startPaymentPoller(): void {
  if (globalForPoller.__driftPaymentPollerStarted) {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn("[payment-poller] DATABASE_URL not set — internal poller disabled");
    return;
  }

  globalForPoller.__driftPaymentPollerStarted = true;

  console.log(`[payment-poller] Starting internal poller (every ${POLL_INTERVAL_MS / 1000}s)`);

  void runPaymentPollCycle().then((result) => {
    if (result.ok) {
      console.log(
        `[payment-poller] Initial cycle complete — detected=${result.detected} settlements=${result.settlements} withdrawals=${result.withdrawals} renewals=${result.subscriptionRenewals}`
      );
    } else if (result.error) {
      console.warn(`[payment-poller] Initial cycle: ${result.error}`);
    }
  });

  setInterval(() => {
    void runPaymentPollCycle().then((result) => {
      if (!result.ok && result.error && result.error !== "Poll cycle already in progress") {
        console.warn(`[payment-poller] Cycle error: ${result.error}`);
      }
    });
  }, POLL_INTERVAL_MS);
}
