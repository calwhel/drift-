"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import { checkoutFeatures } from "@/lib/mock-data";

interface PaymentLinkData {
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  network: string;
  deposit_address: string;
  redirect_url: string | null;
  expiry: string | null;
  status: string;
  customer_email?: string | null;
  business_name: string;
  branding: {
    logo_url: string | null;
    primary_color: string;
    background_color: string;
  };
}

function sanitizeHexColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const shortcode = params.shortcode as string;
  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [customerEmail, setCustomerEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payment-links/public/${shortcode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setLink(data);
        setCustomerEmail(data.customer_email ?? "");
        if (data.expiry) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(data.expiry).getTime() - Date.now()) / 1000)
          );
          setTimeLeft(remaining);
        }
        if (data.status === "paid") setPaymentStatus("completed");
      })
      .catch(() => setError("Payment link not found or expired"));
  }, [shortcode]);

  const pollStatus = useCallback(() => {
    fetch(`/api/payment-links/public/${shortcode}/status`)
      .then((r) => r.json())
      .then((data) => {
        setPaymentStatus(data.status);
        if (data.status === "completed" && data.redirect_url) {
          setTimeout(() => router.push(data.redirect_url), 2000);
        }
      })
      .catch(() => {});
  }, [shortcode, router]);

  useEffect(() => {
    if (!link || paymentStatus === "completed") return;
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [link, paymentStatus, pollStatus]);

  useEffect(() => {
    if (timeLeft === null) return;
    const timer = setInterval(() => setTimeLeft((t) => (t !== null && t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const timeDisplay =
    timeLeft !== null
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
      : null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveCustomerEmail = async () => {
    const trimmed = customerEmail.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setSavingEmail(true);
    setEmailSaved(false);
    try {
      const res = await fetch(`/api/payment-links/public/${shortcode}/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_email: trimmed }),
      });
      if (res.ok) {
        setEmailSaved(true);
        setTimeout(() => setEmailSaved(false), 2000);
      }
    } finally {
      setSavingEmail(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-bg text-drift-muted">
        {error}
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-drift-bg text-drift-muted">
        Loading…
      </div>
    );
  }

  if (paymentStatus === "completed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-drift-bg px-4">
        <div className="card max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-drift-green/20">
            <Icon name="CheckCircle" className="h-6 w-6 text-drift-green" />
          </div>
          <h1 className="text-lg font-semibold text-white">Payment received</h1>
          <p className="mt-2 text-sm text-drift-muted">
            {link.amount} {link.currency} has been confirmed.
          </p>
          {link.redirect_url && (
            <p className="mt-2 text-2xs text-drift-muted">Redirecting…</p>
          )}
        </div>
      </div>
    );
  }

  if (paymentStatus === "expired") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-drift-bg px-4">
        <div className="card max-w-sm p-8 text-center">
          <h1 className="text-lg font-semibold text-white">Payment link expired</h1>
          <p className="mt-2 text-sm text-drift-muted">
            This payment link is no longer active. Please request a new link from the merchant.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = sanitizeHexColor(link.branding.primary_color, "#7c3aed");
  const backgroundColor = sanitizeHexColor(link.branding.background_color, "#0a0a0f");

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      <header className="border-b border-drift-border">
        <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {link.branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.branding.logo_url}
                alt={`${link.business_name} logo`}
                className="h-7 w-7 rounded object-contain"
              />
            ) : (
              <Logo size="sm" showSubtitle={false} />
            )}
            <span className="text-xs font-medium text-white">{link.business_name}</span>
          </div>
          {timeDisplay && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-drift-muted">Expires in</span>
              <span className="font-mono font-medium tabular-nums text-white">{timeDisplay}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-2xs text-drift-muted">
            <Icon name="Shield" className="h-3 w-3" />
            {paymentStatus === "confirming" ? "Confirming…" : "Encrypted"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="card p-4 lg:col-span-2">
            <p className="text-2xs text-drift-muted">{link.title}</p>
            <h1 className="mt-1 text-sm font-semibold text-white">{link.title}</h1>
            {link.description && (
              <p className="mt-1 text-2xs text-drift-muted">{link.description}</p>
            )}
            <ul className="mt-4 space-y-1.5 border-t border-drift-border pt-4">
              {checkoutFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-2xs text-drift-muted">
                  <span className="text-drift-green">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-drift-border pt-4">
              <p className="section-label">Amount due</p>
              <p className="text-lg font-semibold tabular-nums text-white" style={{ color: primaryColor }}>
                {link.amount} {link.currency}
              </p>
            </div>
            <div className="mt-4">
              <label className="section-label mb-1 block">Email for receipt (optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                onBlur={saveCustomerEmail}
                className="input w-full text-xs"
                placeholder="you@example.com"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveCustomerEmail}
                  disabled={savingEmail || !customerEmail}
                  className="text-2xs text-drift-muted hover:text-white disabled:opacity-60"
                >
                  {savingEmail ? "Saving…" : "Save email"}
                </button>
                {emailSaved && <span className="text-2xs text-drift-green">Saved</span>}
              </div>
            </div>
          </div>

          <div className="card p-4 lg:col-span-3">
            <p className="section-label mb-3">
              Pay with {link.currency} ({link.network})
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-center border border-drift-border bg-white p-4">
                <QRCodeSVG value={link.deposit_address} size={160} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="section-label mb-1 block">Wallet address</label>
                  <div className="flex items-center gap-2">
                    <code className="input flex-1 truncate font-mono text-2xs">
                      {link.deposit_address}
                    </code>
                    <button onClick={() => handleCopy(link.deposit_address, "address")} className="btn-secondary !px-2">
                      <Icon name="Copy" className="h-3 w-3" />
                    </button>
                  </div>
                  {copied === "address" && <p className="mt-1 text-2xs text-drift-green">Copied</p>}
                </div>
                <div>
                  <label className="section-label mb-1 block">Amount</label>
                  <div className="flex items-center gap-2">
                    <span className="input flex-1 text-xs">{link.amount} {link.currency}</span>
                    <button
                      onClick={() => handleCopy(`${link.amount} ${link.currency}`, "amount")}
                      className="btn-secondary !px-2"
                    >
                      <Icon name="Copy" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="border border-drift-border bg-drift-bg p-2 text-2xs text-drift-muted">
                  Send only {link.currency} on {link.network}. Other assets will be lost.
                </p>
                <p className="text-2xs text-drift-muted">
                  Waiting for payment… Status updates every 5 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-drift-border py-4 text-center text-2xs text-drift-muted">
        Powered by Drift Payment for {link.business_name}
      </footer>
    </div>
  );
}
