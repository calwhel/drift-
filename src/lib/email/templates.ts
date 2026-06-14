const BRAND = {
  bg: "#0a0a0f",
  card: "#111118",
  border: "#1e1e2e",
  purple: "#7c3aed",
  text: "#ffffff",
  muted: "#9ca3af",
  red: "#ef4444",
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BRAND.bg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background-color:${BRAND.card};border:1px solid ${BRAND.border};border-radius:12px;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.border};">
          <span style="color:${BRAND.text};font-size:16px;font-weight:600;">Drift Payment</span>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:${BRAND.muted};font-size:13px;border-bottom:1px solid ${BRAND.border};">${label}</td>
    <td style="padding:8px 0;color:${BRAND.text};font-size:13px;text-align:right;border-bottom:1px solid ${BRAND.border};">${value}</td>
  </tr>`;
}

function table(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" style="margin:16px 0;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:4px 16px;">
    ${rows.map(([l, v]) => row(l, v)).join("")}
  </table>`;
}

export interface SubscriptionEmailDetails {
  planName: string;
  amount: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  interval: string;
  periodEnd?: string;
  depositAddress?: string;
}

function intervalLabel(interval: string): string {
  if (interval === "week") return "Weekly";
  if (interval === "year") return "Yearly";
  return "Monthly";
}

export function subscriptionPaymentBusinessHtml(d: SubscriptionEmailDetails): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.purple};font-size:12px;font-weight:600;text-transform:uppercase;">Subscription payment</p>
    <h1 style="margin:0 0 12px;color:${BRAND.text};font-size:22px;">Recurring payment received</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;">A subscriber payment for <strong style="color:${BRAND.text}">${d.planName}</strong> has been confirmed.</p>
    ${table([
      ["Plan", d.planName],
      ["Customer", d.customerName || d.customerEmail],
      ["Amount", `${d.amount} ${d.currency}`],
      ["Billing", intervalLabel(d.interval)],
      ...(d.periodEnd ? [["Next billing", d.periodEnd] as [string, string]] : []),
    ])}`;
  return layout("Subscription payment received", body);
}

export function subscriptionPaymentCustomerHtml(d: SubscriptionEmailDetails): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.purple};font-size:12px;font-weight:600;text-transform:uppercase;">Payment confirmed</p>
    <h1 style="margin:0 0 12px;color:${BRAND.text};font-size:22px;">Your subscription is active</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;">Thank you — your payment for <strong style="color:${BRAND.text}">${d.planName}</strong> has been received.</p>
    ${table([
      ["Plan", d.planName],
      ["Amount", `${d.amount} ${d.currency}`],
      ["Billing", intervalLabel(d.interval)],
      ...(d.periodEnd ? [["Next billing date", d.periodEnd] as [string, string]] : []),
    ])}
    <p style="margin:0;color:${BRAND.muted};font-size:13px;">Send your next payment to the same wallet address before the due date.</p>`;
  return layout("Subscription payment confirmed", body);
}

export function subscriptionPastDueHtml(d: SubscriptionEmailDetails): string {
  const body = `
    <p style="margin:0 0 4px;color:${BRAND.red};font-size:12px;font-weight:600;text-transform:uppercase;">Payment overdue</p>
    <h1 style="margin:0 0 12px;color:${BRAND.text};font-size:22px;">Subscription past due</h1>
    <p style="margin:0;color:${BRAND.muted};font-size:14px;">
      We have not received your ${intervalLabel(d.interval).toLowerCase()} payment for <strong style="color:${BRAND.text}">${d.planName}</strong>.
      Please send <strong style="color:${BRAND.text}">${d.amount} ${d.currency}</strong> to your assigned wallet address to keep your subscription active.
    </p>
    ${d.depositAddress ? table([["Wallet address", d.depositAddress]]) : ""}
    <p style="margin:0;color:${BRAND.muted};font-size:13px;">Your subscription may be paused if payment is not received soon.</p>`;
  return layout("Subscription past due", body);
}
