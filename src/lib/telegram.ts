const TELEGRAM_API = "https://api.telegram.org";

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
}

export interface TelegramMessageOptions {
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  };
  disable_web_page_preview?: boolean;
}

export function getTelegramWebhookSecret(): string | undefined {
  return (
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim().slice(0, 32) ||
    undefined
  );
}

export function getTelegramWebhookUrl(): string | null {
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/api/telegram/webhook`;
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

export async function sendTelegramMessageToChat(
  chatId: string | number,
  message: string,
  options?: TelegramMessageOptions
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN is not set" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 4096),
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
        reply_markup: options?.reply_markup,
      }),
    });

    const parsed = await parseTelegramResponse(res);
    if (!parsed.ok) {
      const hint =
        parsed.description?.includes("chat not found")
          ? " Open your bot in Telegram and tap Start first."
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

export async function sendTelegramNotification(message: string): Promise<TelegramSendResult> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();

  if (!isTelegramConfigured()) {
    console.warn(
      "[telegram] Notifications disabled — set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in Railway env vars"
    );
    return { ok: false, skipped: true, error: "Telegram not configured" };
  }

  return sendTelegramMessageToChat(chatId!, message);
}

export async function getTelegramWebhookInfo(): Promise<{
  ok: boolean;
  url?: string;
  pending_update_count?: number;
  last_error_message?: string;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/getWebhookInfo`);
    const body = (await res.json()) as {
      ok?: boolean;
      description?: string;
      result?: {
        url?: string;
        pending_update_count?: number;
        last_error_message?: string;
      };
    };
    if (!body.ok) return { ok: false, error: body.description ?? "getWebhookInfo failed" };
    return {
      ok: true,
      url: body.result?.url,
      pending_update_count: body.result?.pending_update_count,
      last_error_message: body.result?.last_error_message,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "getWebhookInfo error" };
  }
}

export async function registerTelegramWebhook(): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
  skipped?: boolean;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN is not set" };

  const webhookUrl = getTelegramWebhookUrl();
  if (!webhookUrl) {
    return { ok: false, error: "NEXTAUTH_URL is not set — cannot register Telegram webhook" };
  }

  const secret = getTelegramWebhookSecret();
  const payload: Record<string, string> = { url: webhookUrl };
  if (secret) payload.secret_token = secret;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { ok?: boolean; description?: string };
    if (!body.ok) {
      const error = body.description ?? "setWebhook failed";
      console.error("[telegram] setWebhook failed:", error);
      return { ok: false, error };
    }

    console.log("[telegram] Webhook registered:", webhookUrl);
    return { ok: true, url: webhookUrl };
  } catch (err) {
    const error = err instanceof Error ? err.message : "setWebhook error";
    console.error("[telegram] setWebhook error:", err);
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
