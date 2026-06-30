const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    return;
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

    if (!res.ok) {
      const body = await res.text();
      console.error("[telegram] sendMessage failed:", res.status, body);
    }
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
  }
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
