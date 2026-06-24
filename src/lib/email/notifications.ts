import { sendEmail } from "./client";

function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "https://app.drift.payment";
}

function formatAmount(amount: number | string, currency: string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(8).replace(/\.?0+$/, "")} ${currency}`;
}

export async function sendWelcomeEmail(params: { to: string; businessName: string }) {
  const dashboardUrl = `${appBaseUrl()}/dashboard/overview`;
  const subject = "Welcome to Drift Payment";
  const html = `
    <h2>Welcome to Drift Payment, ${params.businessName}!</h2>
    <p>Your account is ready. You can now connect wallets, create payment links, and start accepting crypto.</p>
    <p><a href="${dashboardUrl}">Open Dashboard</a></p>
  `;
  const text = `Welcome to Drift Payment, ${params.businessName}! Open your dashboard: ${dashboardUrl}`;
  await sendEmail({ to: params.to, subject, html, text });
}

export async function sendPaymentCompletedEmails(params: {
  merchantEmail: string;
  merchantName: string;
  customerEmail?: string | null;
  amount: number | string;
  currency: string;
  txHash?: string | null;
  checkoutShortcode?: string | null;
}) {
  const amountText = formatAmount(params.amount, params.currency);
  const checkoutUrl = params.checkoutShortcode ? `${appBaseUrl()}/pay/${params.checkoutShortcode}` : null;
  const txDetails = params.txHash ? `<p>Transaction hash: <code>${params.txHash}</code></p>` : "";

  await sendEmail({
    to: params.merchantEmail,
    subject: `Payment completed: ${amountText}`,
    html: `
      <h2>Payment completed</h2>
      <p>${amountText} has been confirmed for ${params.merchantName}.</p>
      ${txDetails}
      ${checkoutUrl ? `<p>Checkout: <a href="${checkoutUrl}">${checkoutUrl}</a></p>` : ""}
    `,
    text: `Payment completed: ${amountText}${params.txHash ? ` (tx: ${params.txHash})` : ""}`,
  });

  if (params.customerEmail) {
    await sendEmail({
      to: params.customerEmail,
      subject: `Your payment is confirmed (${amountText})`,
      html: `
        <h2>Payment confirmed</h2>
        <p>Your payment of ${amountText} has been confirmed.</p>
        ${txDetails}
      `,
      text: `Your payment of ${amountText} has been confirmed.`,
    });
  }
}

export async function sendPaymentLinkExpiredEmails(params: {
  merchantEmail: string;
  merchantName: string;
  customerEmail?: string | null;
  title: string;
  shortcode: string;
}) {
  const checkoutUrl = `${appBaseUrl()}/pay/${params.shortcode}`;
  const subject = `Payment link expired: ${params.title}`;

  await sendEmail({
    to: params.merchantEmail,
    subject,
    html: `
      <h2>Payment link expired</h2>
      <p>The payment link <strong>${params.title}</strong> has expired.</p>
      <p>Link: <a href="${checkoutUrl}">${checkoutUrl}</a></p>
    `,
    text: `Payment link expired: ${params.title} (${checkoutUrl})`,
  });

  if (params.customerEmail) {
    await sendEmail({
      to: params.customerEmail,
      subject: `Payment link expired: ${params.title}`,
      html: `
        <h2>Payment link expired</h2>
        <p>The payment link for <strong>${params.title}</strong> has expired.</p>
      `,
      text: `The payment link for "${params.title}" has expired.`,
    });
  }
}

export async function sendSubscriptionDueEmails(params: {
  merchantEmail: string;
  merchantName: string;
  customerEmail: string;
  customerName?: string | null;
  planName: string;
  amount: number | string;
  currency: string;
  interval: string;
  checkoutShortcode: string;
}) {
  const amountText = formatAmount(params.amount, params.currency);
  const checkoutUrl = `${appBaseUrl()}/pay/${params.checkoutShortcode}`;
  const subject = `Subscription payment due: ${params.planName}`;

  await sendEmail({
    to: params.merchantEmail,
    subject,
    html: `
      <h2>Subscription payment due</h2>
      <p>${params.customerEmail} is due for <strong>${params.planName}</strong> (${params.interval}).</p>
      <p>Amount: ${amountText}</p>
      <p>Checkout: <a href="${checkoutUrl}">${checkoutUrl}</a></p>
    `,
    text: `Subscription due for ${params.customerEmail}: ${params.planName} (${amountText}) ${checkoutUrl}`,
  });

  await sendEmail({
    to: params.customerEmail,
    subject,
    html: `
      <h2>Your subscription payment is due</h2>
      <p>${params.customerName ? `Hi ${params.customerName},` : "Hi,"}</p>
      <p>Your ${params.interval} subscription <strong>${params.planName}</strong> is due.</p>
      <p>Amount: ${amountText}</p>
      <p>Pay here: <a href="${checkoutUrl}">${checkoutUrl}</a></p>
    `,
    text: `Your subscription payment is due for ${params.planName} (${amountText}). Pay: ${checkoutUrl}`,
  });
}
