import {
  getTelegramWebhookSecret,
  getTelegramWebhookUrl,
  sendTelegramMessageToChat,
  sendTelegramTestNotification,
  verifyTelegramBot,
} from "./telegram";

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

function getAppUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "https://drift-production-9c09.up.railway.app").replace(/\/$/, "");
}

function isAdminChat(chatId: number | string): boolean {
  const adminId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  return Boolean(adminId && String(chatId) === adminId);
}

function startMenuText(): string {
  return [
    "👋 Welcome to Drift Admin",
    "",
    "This bot sends real-time alerts for your payment platform:",
    "",
    "💰 Completed payments",
    "👤 New merchant signups",
    "📩 Support requests",
    "💸 Withdrawal requests",
    "✅ Fee settlements",
    "",
    "Use the menu below, or send /help anytime.",
  ].join("\n");
}

function startMenuKeyboard() {
  const appUrl = getAppUrl();
  return {
    inline_keyboard: [
      [
        { text: "📊 Open Dashboard", url: `${appUrl}/dashboard/overview` },
        { text: "🔔 Test Alert", callback_data: "test_alert" },
      ],
      [
        { text: "ℹ️ Bot Status", callback_data: "status" },
        { text: "📖 Help", callback_data: "help" },
      ],
      [{ text: "⚙️ Admin Panel", url: `${appUrl}/admin/overview` }],
    ],
  };
}

function helpText(): string {
  return [
    "📖 Drift Admin Bot — Help",
    "",
    "Commands:",
    "/start — Show the main menu",
    "/status — Check bot & webhook status",
    "/test — Send a test alert",
    "/help — Show this message",
    "",
    "Alerts are sent automatically when events happen on the platform.",
    "No need to keep chatting with the bot — just leave notifications on.",
  ].join("\n");
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: Boolean(text && text.length > 60),
    }),
  });
}

async function sendMenu(chatId: number | string): Promise<void> {
  await sendTelegramMessageToChat(chatId, startMenuText(), {
    reply_markup: startMenuKeyboard(),
  });
}

async function sendStatus(chatId: number | string): Promise<void> {
  const verify = await verifyTelegramBot();
  const webhookUrl = getTelegramWebhookUrl();
  const lines = [
    "ℹ️ Bot Status",
    "",
    verify.ok ? `✅ Bot: @${verify.username ?? "connected"}` : `❌ Bot: ${verify.error ?? "offline"}`,
    webhookUrl ? `🔗 Webhook: ${webhookUrl}` : "⚠️ Webhook URL unavailable (set NEXTAUTH_URL)",
    `🕐 ${new Date().toISOString()}`,
  ];
  await sendTelegramMessageToChat(chatId, lines.join("\n"), {
    reply_markup: startMenuKeyboard(),
  });
}

async function handleAdminCommand(chatId: number | string, text: string): Promise<void> {
  const command = text.split(/\s+/)[0]?.toLowerCase().replace(/@\w+$/, "");

  switch (command) {
    case "/start":
      await sendMenu(chatId);
      break;
    case "/help":
      await sendTelegramMessageToChat(chatId, helpText(), { reply_markup: startMenuKeyboard() });
      break;
    case "/status":
      await sendStatus(chatId);
      break;
    case "/test":
      await sendTelegramTestNotification();
      await sendTelegramMessageToChat(chatId, "✅ Test alert sent — you should see it above.", {
        reply_markup: startMenuKeyboard(),
      });
      break;
    default:
      await sendTelegramMessageToChat(chatId, "Unknown command. Tap /start for the menu.", {
        reply_markup: startMenuKeyboard(),
      });
  }
}

async function handleCallback(chatId: number | string, callbackQueryId: string, data: string): Promise<void> {
  if (!isAdminChat(chatId)) {
    await answerCallbackQuery(callbackQueryId, "This bot is for Drift admins only.");
    return;
  }

  switch (data) {
    case "test_alert": {
      const result = await sendTelegramTestNotification();
      await answerCallbackQuery(
        callbackQueryId,
        result.ok ? "Test alert sent!" : result.error ?? "Test failed"
      );
      if (result.ok) {
        await sendTelegramMessageToChat(chatId, "✅ Test alert delivered.", {
          reply_markup: startMenuKeyboard(),
        });
      }
      break;
    }
    case "status":
      await answerCallbackQuery(callbackQueryId);
      await sendStatus(chatId);
      break;
    case "help":
      await answerCallbackQuery(callbackQueryId);
      await sendTelegramMessageToChat(chatId, helpText(), { reply_markup: startMenuKeyboard() });
      break;
    default:
      await answerCallbackQuery(callbackQueryId, "Unknown action — try /start");
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const { callback_query: query } = update;
    const chatId = query.message?.chat.id ?? query.from.id;
    const data = query.data ?? "";
    await handleCallback(chatId, query.id, data);
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (!text.startsWith("/")) {
    if (isAdminChat(chatId)) {
      await sendTelegramMessageToChat(chatId, "Tap /start to open the menu.", {
        reply_markup: startMenuKeyboard(),
      });
    }
    return;
  }

  if (!isAdminChat(chatId)) {
    await sendTelegramMessageToChat(
      chatId,
      "This bot is for Drift platform admins only. If you run a business on Drift, use the dashboard instead."
    );
    return;
  }

  await handleAdminCommand(chatId, text);
}

export function isValidTelegramWebhookSecret(header: string | null): boolean {
  const secret = getTelegramWebhookSecret();
  if (!secret) return true;
  return header === secret;
}
