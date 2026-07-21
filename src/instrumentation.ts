export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Next.js invokes instrumentation during `next build`; skip DB/poller side effects then.
    if (
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-export"
    ) {
      return;
    }

    const { startPaymentPoller } = await import("@/lib/payment-poller");
    startPaymentPoller();

    const { isTelegramConfigured, registerTelegramWebhook } = await import("@/lib/telegram");
    if (!isTelegramConfigured()) {
      console.warn(
        "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set — admin notifications disabled"
      );
    } else {
      const webhook = await registerTelegramWebhook();
      if (!webhook.ok && !webhook.skipped) {
        console.warn("[telegram] Webhook registration failed:", webhook.error);
      }
    }
  }
}
