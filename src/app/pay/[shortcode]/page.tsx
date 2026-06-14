"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Icon } from "@/components/icons";
import { checkoutFeatures } from "@/lib/mock-data";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_PRIMARY_COLOR,
  type PublicBranding,
} from "@/lib/branding";

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
  branding?: PublicBranding;
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

function BrandHeader({ branding }: { branding: PublicBranding }) {
  const name = branding.business_name ?? "Checkout";

  return (
    <div className="flex items-center gap-2">
      {branding.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logo_url}
          alt={name}
          className="h-8 max-w-[140px] object-contain"
        />
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-white"
          style={{ backgroundColor: branding.primary_color }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {branding.description && (
          <p className="truncate text-2xs opacity-70" style={{ color: "var(--brand-muted)" }}>
            {branding.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const shortcode = params.shortcode as string;
  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [customerEmail, setCustomerEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const branding = link?.branding ?? DEFAULT_BRANDING;

  const brandStyle = {
    "--brand-primary": branding.primary_color,
    "--brand-bg": branding.background_color,
    "--brand-card": branding.card_color,
    "--brand-border": branding.border_color,
    "--brand-muted": "#9ca3af",
  } as CSSProperties;

  useEffect(() => {
    fetch(`/api/payment-links/public/${shortcode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setLink(data);
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

  const cardClass =
    "rounded-lg border p-4";
  const cardStyle = {
    backgroundColor: "var(--brand-card)",
    borderColor: "var(--brand-border)",
  };
  const inputStyle = {
    backgroundColor: "var(--brand-bg)",
    borderColor: "var(--brand-border)",
    color: "#ffffff",
  };

  if (error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ ...brandStyle, backgroundColor: branding.background_color, color: "#9ca3af" }}
      >
        {error}
      </div>
    );
  }

  if (!link) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ ...brandStyle, backgroundColor: branding.background_color, color: "#9ca3af" }}
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
        <div className={cardClass} style={{ ...cardStyle, maxWidth: "24rem", textAlign: "center" }}>
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: `${branding.primary_color}33`, color: branding.primary_color }}
          >
            <Icon name="CheckCircle" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-white">Payment received</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--brand-muted)" }}>
            {link.amount} {link.currency} has been confirmed.
          </p>
          {link.redirect_url && (
            <p className="mt-2 text-2xs" style={{ color: "var(--brand-muted)" }}>Redirecting…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ ...brandStyle, backgroundColor: branding.background_color }}>
      <header style={{ borderBottom: `1px solid ${branding.border_color}` }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <BrandHeader branding={branding} />
          {timeDisplay && (
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: "var(--brand-muted)" }}>Expires in</span>
              <span className="font-mono font-medium tabular-nums text-white">{timeDisplay}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-2xs" style={{ color: "var(--brand-muted)" }}>
            <Icon name="Shield" className="h-3 w-3" />
            {paymentStatus === "confirming" ? "Confirming…" : "Encrypted"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className={`${cardClass} lg:col-span-2`} style={cardStyle}>
            <p className="text-2xs" style={{ color: "var(--brand-muted)" }}>{link.title}</p>
            <h1 className="mt-1 text-sm font-semibold text-white">{link.title}</h1>
            {link.description && (
              <p className="mt-1 text-2xs" style={{ color: "var(--brand-muted)" }}>{link.description}</p>
            )}
            <ul className="mt-4 space-y-1.5 pt-4" style={{ borderTop: `1px solid ${branding.border_color}` }}>
              {checkoutFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-2xs" style={{ color: "var(--brand-muted)" }}>
                  <span style={{ color: branding.primary_color }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${branding.border_color}` }}>
              <p className="mb-1 text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                Amount due
              </p>
              <p className="text-lg font-semibold tabular-nums text-white">
                {link.amount} {link.currency}
              </p>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                Email for receipt (optional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded border px-3 py-1.5 text-xs focus:outline-none"
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className={`${cardClass} lg:col-span-3`} style={cardStyle}>
            <p className="mb-3 text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
              Pay with {link.currency} ({link.network})
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-center border bg-white p-4" style={{ borderColor: branding.border_color }}>
                <QRCodeSVG value={link.deposit_address} size={160} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                    Wallet address
                  </label>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 truncate rounded border px-3 py-1.5 font-mono text-2xs"
                      style={inputStyle}
                    >
                      {link.deposit_address}
                    </code>
                    <button
                      onClick={() => handleCopy(link.deposit_address, "address")}
                      className="rounded border px-2 py-1.5 text-xs text-white"
                      style={{ borderColor: branding.border_color, backgroundColor: branding.card_color }}
                    >
                      <Icon name="Copy" className="h-3 w-3" />
                    </button>
                  </div>
                  {copied === "address" && (
                    <p className="mt-1 text-2xs" style={{ color: branding.primary_color }}>Copied</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-2xs font-medium uppercase tracking-wide" style={{ color: "var(--brand-muted)" }}>
                    Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 rounded border px-3 py-1.5 text-xs text-white" style={inputStyle}>
                      {link.amount} {link.currency}
                    </span>
                    <button
                      onClick={() => handleCopy(`${link.amount} ${link.currency}`, "amount")}
                      className="rounded border px-2 py-1.5 text-xs text-white"
                      style={{ borderColor: branding.border_color, backgroundColor: branding.card_color }}
                    >
                      <Icon name="Copy" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p
                  className="border p-2 text-2xs"
                  style={{ borderColor: branding.border_color, backgroundColor: branding.background_color, color: "var(--brand-muted)" }}
                >
                  Send only {link.currency} on {link.network}. Other assets will be lost.
                </p>
                <p className="text-2xs" style={{ color: "var(--brand-muted)" }}>
                  Waiting for payment… Status updates every 5 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className="py-4 text-center text-2xs"
        style={{ borderTop: `1px solid ${branding.border_color}`, color: "var(--brand-muted)" }}
      >
        Powered by{" "}
        <span style={{ color: branding.primary_color }}>Drift Payment</span>
      </footer>
    </div>
  );
}
