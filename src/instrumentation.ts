export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPaymentPoller } = await import("@/lib/payment-poller");
    startPaymentPoller();
  }
}
