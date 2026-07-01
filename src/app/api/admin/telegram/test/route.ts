import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getTelegramConfigStatus,
  getTelegramWebhookInfo,
  getTelegramWebhookUrl,
  registerTelegramWebhook,
  sendTelegramTestNotification,
  verifyTelegramBot,
} from "@/lib/telegram";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }

  const config = getTelegramConfigStatus();
  const bot = config.configured ? await verifyTelegramBot() : { ok: false as const, error: "Not configured" };
  const webhook = config.configured ? await getTelegramWebhookInfo() : { ok: false as const, error: "Not configured" };
  const expectedWebhookUrl = getTelegramWebhookUrl();

  return NextResponse.json({
    config,
    bot: bot.ok ? { ok: true, username: bot.username } : { ok: false, error: bot.error },
    webhook: webhook.ok
      ? {
          ok: true,
          url: webhook.url,
          expected_url: expectedWebhookUrl,
          registered: Boolean(expectedWebhookUrl && webhook.url === expectedWebhookUrl),
          pending_update_count: webhook.pending_update_count,
          last_error_message: webhook.last_error_message,
        }
      : { ok: false, error: webhook.error },
    note: "Send /start to your bot in Telegram to open the admin menu.",
  });
}

export async function POST() {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: message === "Forbidden" ? 403 : 401 });
  }

  const config = getTelegramConfigStatus();
  if (!config.configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in Railway → Variables, then redeploy.",
        config,
      },
      { status: 503 }
    );
  }

  const register = await registerTelegramWebhook();
  if (!register.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: register.error ?? "Failed to register webhook",
        config,
        hint: "Ensure NEXTAUTH_URL is set to your public Railway URL (https://…).",
      },
      { status: 502 }
    );
  }

  const result = await sendTelegramTestNotification();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        config,
        hint: "Make sure you tapped Start on your bot in Telegram first. Regenerate the token in @BotFather if it was exposed.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Webhook registered and test notification sent — check Telegram and try /start.",
    config,
    webhook_url: register.url,
  });
}
