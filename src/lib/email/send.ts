import { Resend } from "resend";
import {
  welcomeEmailHtml,
  paymentReceivedBusinessHtml,
  paymentReceivedCustomerHtml,
  paymentLinkExpiredHtml,
  type PaymentEmailDetails,
} from "./templates";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Drift Payment <onboarding@resend.dev>";
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Send error:", err);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, businessName: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://drift.payment";
  const html = welcomeEmailHtml(businessName, `${baseUrl}/dashboard/overview`);
  return sendEmail(to, "Welcome to Drift Payment", html);
}

export async function sendPaymentReceivedEmails(
  businessEmail: string,
  customerEmail: string | null | undefined,
  details: PaymentEmailDetails
): Promise<void> {
  const businessHtml = paymentReceivedBusinessHtml(details);
  await sendEmail(
    businessEmail,
    `Payment received — ${details.amount} ${details.currency}`,
    businessHtml
  );

  if (customerEmail && customerEmail.includes("@")) {
    const customerHtml = paymentReceivedCustomerHtml(details);
    await sendEmail(
      customerEmail,
      `Payment confirmed — ${details.amount} ${details.currency}`,
      customerHtml
    );
  }
}

export async function sendPaymentLinkExpiredEmail(
  businessEmail: string,
  linkTitle: string,
  amount: string,
  currency: string
): Promise<boolean> {
  const html = paymentLinkExpiredHtml(linkTitle, amount, currency);
  return sendEmail(businessEmail, `Payment link expired — ${linkTitle}`, html);
}

export { type PaymentEmailDetails };
