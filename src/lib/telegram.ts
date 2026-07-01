const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_ADMIN_CHAT_ID?.trim());
}

export function getTelegramConfigStatus() {
  return {
    bot_token: process.env.TELEGRAM_BOT_TOKEN ? "set" : "missing",
    admin_chat_id: process.env.TELEGRAM_ADMIN_CHAT_ID ? "set" : "missing",
    configured: isTelegramConfigured(),
  };
}

async function parseTelegramResponse(res: Response): Promise<{ ok: boolean; error?: string; description?: string }> {
  const body = await res.text();
  try {
    const json = JSON.parse(body) as { ok?: boolean; description?: string };
    if (json.ok) return { ok: true };
    return { ok: false, error: json.description ?? body, description: json.description };
  } catch {
    return { ok: false, error: body || `HTTP ${res.status}` };
  }
}

export async function verifyTelegramBot(): Promise<{ ok: boolean; username?: string; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
    const body = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: { username?: string };
    };
    if (!body.ok) {
      return { ok: false, error: body.description ?? "Invalid bot token" };
    }
    return { ok: true, username: body.result?.username };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach Telegram API" };
  }
}

export async function sendTelegramNotification(message: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn(
      "[telegram] Notifications disabled — set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in Railway env vars"
    );
    return { ok: false, skipped: true, error: "Telegram not configured" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 4096),
        disable_web_page_preview: true,
      }),
    });

    const parsed = await parseTelegramResponse(res);
    if (!parsed.ok) {
      const hint =
        parsed.description?.includes("chat not found")
          ? " Open your bot in Telegram, tap Start, then use chat ID 5603353066"
          : "";
      const error = `${parsed.error ?? "sendMessage failed"}${hint}`;
      console.error("[telegram] sendMessage failed:", error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "sendMessage error";
    console.error("[telegram] sendMessage error:", err);
    return { ok: false, error };
  }
}

export async function sendTelegramTestNotification(): Promise<TelegramSendResult> {
  const verify = await verifyTelegramBot();
  if (!verify.ok) {
    return { ok: false, error: verify.error };
  }

  return sendTelegramNotification(
    [
      "✅ Drift Telegram test",
      "",
      "Admin notifications are working.",
      `Bot: @${verify.username ?? "unknown"}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n")
  );
}

export function notifyPaymentCompleted(params: {
  amount: string | number;
  currency: string;
  network: string;
  merchantName: string;
  feeAmount: string | number;
  netAmount: string | number;
}): void {
  void sendTelegramNotification(
    [
      "💰 Payment Completed ✅",
      "",
      `Amount: ${params.amount} ${params.currency} (${params.network})`,
      `Merchant: ${params.merchantName}`,
      `Fee (1.5%): ${params.feeAmount} ${params.currency}`,
      `Net to merchant: ${params.netAmount} ${params.currency}`,
    ].join("\n")
  );
}

export function notifyFeeSettlementSuccess(params: {
  network: string;
  amount: string | number;
  currency: string;
  txHash: string;
}): void {
  void sendTelegramNotification(
    [
      "✅ Fee Settlement Success",
      "",
      `Network: ${params.network}`,
      `Amount: ${params.amount} ${params.currency}`,
      `Tx: ${params.txHash}`,
    ].join("\n")
  );
}

export function notifyFeeSettlementFailed(params: {
  network: string;
  amount: string | number;
  currency: string;
  error: string;
}): void {
  void sendTelegramNotification(
    [
      "❌ Fee Settlement Failed",
      "",
      `Network: ${params.network}`,
      `Amount: ${params.amount} ${params.currency}`,
      `Error: ${params.error}`,
    ].join("\n")
  );
}

export function notifyNewSignup(params: { email: string; businessName: string }): void {
  void sendTelegramNotification(
    [
      "👤 New Business Signup",
      "",
      `Email: ${params.email}`,
      `Business: ${params.businessName}`,
    ].join("\n")
  );
}

export function notifySupportRequest(params: { email: string; message: string }): void {
  void sendTelegramNotification(
    [
      "📩 Support Request",
      "",
      `From: ${params.email}`,
      "",
      "Message:",
      params.message,
    ].join("\n")
  );
}

export function notifyWithdrawalRequested(params: {
  amount: string | number;
  currency: string;
  network: string;
  toAddress: string;
  merchantName?: string;
}): void {
  const lines = [
    "💸 Withdrawal Requested",
    "",
    `Amount: ${params.amount} ${params.currency}`,
    `Network: ${params.network}`,
    `To: ${params.toAddress}`,
  ];
  if (params.merchantName) {
    lines.splice(2, 0, `Merchant: ${params.merchantName}`);
  }
  void sendTelegramNotification(lines.join("\n"));
}
