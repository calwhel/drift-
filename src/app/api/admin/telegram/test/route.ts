import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getTelegramConfigStatus,
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

  return NextResponse.json({
    config,
    bot: bot.ok ? { ok: true, username: bot.username } : { ok: false, error: bot.error },
    note: "This bot sends admin alerts only — it does not reply when you message it in Telegram.",
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

  const result = await sendTelegramTestNotification();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        config,
        hint:
          "Make sure you tapped Start on your bot in Telegram first. Chat ID should be 5603353066. Regenerate the token in @BotFather if it was exposed.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Test notification sent — check your Telegram app.",
    config,
  });
}
