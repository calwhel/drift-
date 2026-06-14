import { Resend } from "resend";
import {
  subscriptionPastDueHtml,
  subscriptionPaymentBusinessHtml,
  subscriptionPaymentCustomerHtml,
  type SubscriptionEmailDetails,
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

export async function sendSubscriptionPaymentEmails(
  businessEmail: string,
  customerEmail: string,
  details: SubscriptionEmailDetails
): Promise<void> {
  await sendEmail(
    businessEmail,
    `Subscription payment received — ${details.planName}`,
    subscriptionPaymentBusinessHtml(details)
  );
  await sendEmail(
    customerEmail,
    `Subscription payment confirmed — ${details.planName}`,
    subscriptionPaymentCustomerHtml(details)
  );
}

export async function sendSubscriptionPastDueEmail(
  customerEmail: string,
  details: SubscriptionEmailDetails
): Promise<boolean> {
  return sendEmail(
    customerEmail,
    `Subscription payment overdue — ${details.planName}`,
    subscriptionPastDueHtml(details)
  );
}

export { type SubscriptionEmailDetails };
