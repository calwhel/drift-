const BRAND = {
  bg: "#0a0a0f",
  card: "#111118",
  border: "#1e1e2e",
  purple: "#7c3aed",
  purpleDark: "#6d28d9",
  text: "#ffffff",
  muted: "#9ca3af",
  green: "#22c55e",
};

function layout(title: string, body: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:32px;height:32px;background:${BRAND.purple};border-radius:8px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:700;font-size:16px;line-height:32px;">D</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="color:${BRAND.text};font-size:16px;font-weight:600;">Drift Payment</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.5;">
                ${footerNote ?? "Drift Payment — modern crypto payments for businesses"}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;color:${BRAND.muted};font-size:13px;border-bottom:1px solid ${BRAND.border};">${label}</td>
    <td style="padding:10px 0;color:${BRAND.text};font-size:13px;text-align:right;border-bottom:1px solid ${BRAND.border};font-weight:500;">${value}</td>
  </tr>`;
}

function detailsTable(rows: Array<[string, string]>): string {
  const inner = rows.map(([l, v]) => row(l, v)).join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:4px 16px;">
    ${inner}
  </table>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:8px;background:${BRAND.purple};">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export interface PaymentEmailDetails {
  amount: string;
  currency: string;
  network: string;
  customer: string;
  transactionId: string;
  feeAmount: string;
  netAmount: string;
  linkTitle?: string;
}

export function welcomeEmailHtml(businessName: string, dashboardUrl: string): string {
  const body = `
    <h1 style="margin:0 0 8px;color:${BRAND.text};font-size:22px;font-weight:600;">Welcome to Drift Payment</h1>
    <p style="margin:0 0 16px;color:${BRAND.muted};font-size:15px;line-height:1.6;">
      Hi ${businessName}, your account is ready. Start accepting crypto payments in minutes.
    </p>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Set up your wallets, create payment links, and track transactions from your dashboard.
    </p>
    ${button(dashboardUrl, "Go to dashboard")}
  `;
  return layout("Welcome to Drift Payment", body);
}

export function paymentReceivedBusinessHtml(details: PaymentEmailDetails): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.green};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Payment received</p>
    <h1 style="margin:0 0 8px;color:${BRAND.text};font-size:22px;font-weight:600;">You received a payment</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      ${details.linkTitle ? `Payment for <strong style="color:${BRAND.text};">${details.linkTitle}</strong> has been confirmed.` : "A new payment has been confirmed on your account."}
    </p>
    ${detailsTable([
      ["Amount", `${details.amount} ${details.currency}`],
      ["Network", details.network],
      ["Customer", details.customer],
      ["Transaction ID", details.transactionId.slice(0, 12).toUpperCase()],
      ["Platform fee (1.5%)", `${details.feeAmount} ${details.currency}`],
      ["Net amount", `${details.netAmount} ${details.currency}`],
    ])}
    <p style="margin:0;color:${BRAND.muted};font-size:13px;">Funds have been credited to your wallet balance.</p>
  `;
  return layout("Payment received", body);
}

export function paymentReceivedCustomerHtml(details: PaymentEmailDetails): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.purple};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Payment confirmed</p>
    <h1 style="margin:0 0 8px;color:${BRAND.text};font-size:22px;font-weight:600;">Thank you for your payment</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Your payment has been received and confirmed on the blockchain.
    </p>
    ${detailsTable([
      ["Amount", `${details.amount} ${details.currency}`],
      ["Network", details.network],
      ["Transaction ID", details.transactionId.slice(0, 12).toUpperCase()],
      ...(details.linkTitle ? [["Item", details.linkTitle] as [string, string]] : []),
    ])}
    <p style="margin:0;color:${BRAND.muted};font-size:13px;">Keep this email for your records.</p>
  `;
  return layout("Payment confirmation", body);
}

export function paymentLinkExpiredHtml(linkTitle: string, amount: string, currency: string): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.muted};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Link expired</p>
    <h1 style="margin:0 0 8px;color:${BRAND.text};font-size:22px;font-weight:600;">Payment link expired</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.6;">
      Your payment link <strong style="color:${BRAND.text};">${linkTitle}</strong> has expired and is no longer accepting payments.
    </p>
    ${detailsTable([
      ["Link", linkTitle],
      ["Amount", `${amount} ${currency}`],
      ["Status", "Expired"],
    ])}
    <p style="margin:0;color:${BRAND.muted};font-size:13px;">Create a new payment link from your dashboard if you still need to collect this payment.</p>
  `;
  return layout("Payment link expired", body);
}
