import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate, isValidTelegramWebhookSecret, type TelegramUpdate } from "@/lib/telegram-bot";

export async function POST(req: NextRequest) {
  if (!isValidTelegramWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("[telegram] webhook handler error:", err);
  }

  return NextResponse.json({ ok: true });
}
