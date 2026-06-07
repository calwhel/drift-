"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
}

export default function CheckoutPage() {
  const params = useParams();
  const shortcode = params.shortcode as string;
  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60 - 1);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payment-links/public/${shortcode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setLink)
      .catch(() => setError("Payment link not found or expired"));
  }, [shortcode]);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeDisplay = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
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

  return (
    <div className="min-h-screen bg-drift-bg">
      <header className="border-b border-drift-border">
        <div className="mx-auto flex h-11 max-w-5xl items-center justify-between px-4">
          <Logo size="sm" showSubtitle={false} />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-drift-muted">Expires in</span>
            <span className="font-mono font-medium tabular-nums text-white">{timeDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5 text-2xs text-drift-muted">
            <Icon name="Shield" className="h-3 w-3" />
            Encrypted
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
              <p className="text-lg font-semibold tabular-nums text-white">
                {link.amount} {link.currency}
              </p>
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
                  1.5% processing fee applied. Merchant receives 98.5%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-drift-border py-4 text-center text-2xs text-drift-muted">
        Powered by Drift Payment
      </footer>
    </div>
  );
}
