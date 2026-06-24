import { Resend } from "resend";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

let resendClient: Resend | null = null;
let warnedMissingConfig = false;

function getConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
  };
}

function getResendClient(): Resend | null {
  const { apiKey } = getConfig();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export function emailEnabled() {
  const { apiKey, fromEmail } = getConfig();
  return Boolean(apiKey && fromEmail);
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const { fromEmail } = getConfig();
  const client = getResendClient();

  if (!client || !fromEmail) {
    if (!warnedMissingConfig) {
      console.warn("Email delivery disabled: RESEND_API_KEY or RESEND_FROM_EMAIL is missing.");
      warnedMissingConfig = true;
    }
    return { ok: false, skipped: true };
  }

  await client.emails.send({
    from: fromEmail,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return { ok: true };
}
