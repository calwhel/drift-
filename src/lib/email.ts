export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() ||
      (process.env.SMTP_HOST?.trim() && process.env.EMAIL_FROM?.trim())
  );
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM?.trim() || "Drift <noreply@driftpayment.io>";
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: body || `Resend HTTP ${res.status}` };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Email send failed" };
    }
  }

  if (process.env.SMTP_HOST?.trim()) {
    console.warn("[email] SMTP configured but not implemented — set RESEND_API_KEY for password reset emails");
    return { ok: false, error: "Email provider not configured" };
  }

  return { ok: false, error: "Email provider not configured" };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to,
    subject: "Reset your Drift password",
    html: `
      <p>You requested a password reset for your Drift account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
    text: `Reset your Drift password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}
