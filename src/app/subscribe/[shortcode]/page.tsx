"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Icon } from "@/components/icons";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_PRIMARY_COLOR,
  type PublicBranding,
} from "@/lib/branding";
import { formatInterval } from "@/lib/subscriptions/intervals";

interface PlanData {
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  network: string;
  interval: string;
  branding?: PublicBranding;
}

interface SubscriberData {
  id: string;
  deposit_address: string;
  amount: string;
  currency: string;
  network: string;
  status: string;
}

const DEFAULT_BRANDING: PublicBranding = {
  logo_url: null,
  primary_color: DEFAULT_PRIMARY_COLOR,
  background_color: DEFAULT_BACKGROUND_COLOR,
  card_color: "#111118",
  border_color: "#1e1e2e",
  business_name: null,
  description: null,
};

export default function SubscribePage() {
  const params = useParams();
  const shortcode = params.shortcode as string;

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [subscriber, setSubscriber] = useState<SubscriberData | null>(null);
  const [error, setError] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [copied, setCopied] = useState<string | null>(null);

  const branding = plan?.branding ?? DEFAULT_BRANDING;
  const brandStyle = {
    "--brand-primary": branding.primary_color,
    "--brand-bg": branding.background_color,
    "--brand-card": branding.card_color,
    "--brand-border": branding.border_color,
    "--brand-muted": "#9ca3af",
  } as CSSProperties;

  const cardStyle = {
    backgroundColor: "var(--brand-card)",
    borderColor: "var(--brand-border)",
  };
  const inputStyle = {
    backgroundColor: "var(--brand-bg)",
    borderColor: "var(--brand-border)",
    color: "#ffffff",
  };

  useEffect(() => {
    fetch(`/api/subscription-plans/public/${shortcode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setPlan)
      .catch(() => setError("Subscription plan not found"));
  }, [shortcode]);

  const pollStatus = useCallback(() => {
    if (!subscriber) return;
    fetch(`/api/subscriptions/public/${subscriber.id}/status`)
      .then((r) => r.json())
      .then((data) => {
        setPaymentStatus(data.payment_status);
        if (data.status === "active") setPaymentStatus("completed");
      })
      .catch(() => {});
  }, [subscriber]);

  useEffect(() => {
    if (!subscriber || paymentStatus === "completed") return;
    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [subscriber, paymentStatus, pollStatus]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/subscription-plans/public/${shortcode}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_email: customerEmail,
          customer_name: customerName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to subscribe");
      setSubscriber(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const displayName = branding.business_name ?? plan?.name ?? "Subscribe";

  if (error && !plan) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: branding.background_color, color: "#9ca3af" }}
      >
        {error}
      </div>
    );
  }

  if (!plan) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: branding.background_color, color: "#9ca3af" }}
      >
        Loading…
      </div>
    );
  }

  if (paymentStatus === "completed") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-4"
        style={{ ...brandStyle, backgroundColor: branding.background_color }}
      >
        <div className="max-w-sm rounded-lg border p-8 text-center" style={cardStyle}>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${branding.primary_color}33`, color: branding.primary_color }}
          >
            <Icon name="CheckCircle" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-white">Subscription active</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>
            Your {formatInterval(plan.interval).toLowerCase()} subscription to {plan.name} is now active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ ...brandStyle, backgroundColor: branding.background_color }}>
      <header style={{ borderBottom: `1px solid ${branding.border_color}` }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          {branding.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logo_url} alt={displayName} className="h-8 max-w-[140px] object-contain" />
          ) : (
            <span className="text-sm font-semibold text-white">{displayName}</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!subscriber ? (
          <div className="rounded-lg border p-6" style={cardStyle}>
            <p className="text-2xs font-medium uppercase tracking-wide" style={{ color: branding.primary_color }}>
              {formatInterval(plan.interval)} plan
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">{plan.name}</h1>
            {plan.description && (
              <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>{plan.description}</p>
            )}
            <p className="mt-4 text-2xl font-semibold tabular-nums text-white">
              {plan.amount} {plan.currency}
              <span className="ml-2 text-sm font-normal" style={{ color: "var(--brand-muted)" }}>
                / {plan.interval}
              </span>
            </p>

            <form onSubmit={handleSubscribe} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                  Name (optional)
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                  placeholder="Your name"
                />
              </div>
              {error && (
                <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded px-4 py-2.5 text-sm font-medium text-white"
                style={{ backgroundColor: branding.primary_color }}
              >
                {loading ? "Setting up…" : "Continue to payment"}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-6" style={cardStyle}>
              <h2 className="text-lg font-semibold text-white">Complete your first payment</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--brand-muted)" }}>
                Send exactly {subscriber.amount} {subscriber.currency} on {subscriber.network} to activate your subscription.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-center border bg-white p-4" style={{ borderColor: branding.border_color }}>
                  <QRCodeSVG value={subscriber.deposit_address} size={160} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                      Wallet address
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 truncate rounded border px-3 py-1.5 font-mono text-2xs" style={inputStyle}>
                        {subscriber.deposit_address}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(subscriber.deposit_address, "address")}
                        className="rounded border px-2 py-1.5"
                        style={{ borderColor: branding.border_color, color: "#fff" }}
                      >
                        <Icon name="Copy" className="h-3 w-3" />
                      </button>
                    </div>
                    {copied === "address" && (
                      <p className="mt-1 text-2xs" style={{ color: branding.primary_color }}>Copied</p>
                    )}
                  </div>
                  <p className="text-2xs" style={{ color: "var(--brand-muted)" }}>
                    {paymentStatus === "past_due" ? "Payment overdue — " : ""}
                    Waiting for payment… Status updates every 5 seconds.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-center text-2xs" style={{ color: "var(--brand-muted)" }}>
              Use this same wallet address for all future {plan.interval}ly payments.
            </p>
          </div>
        )}
      </main>

      <footer
        className="py-4 text-center text-2xs"
        style={{ borderTop: `1px solid ${branding.border_color}`, color: "var(--brand-muted)" }}
      >
        Powered by <span style={{ color: branding.primary_color }}>Drift Payment</span>
      </footer>
    </div>
  );
}
