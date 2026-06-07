"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import { CryptoIcon } from "@/components/crypto-icon";
import { checkoutFeatures, paymentMethods } from "@/lib/mock-data";

const WALLET_ADDRESS = "TPa7x6h9Q8mR2ygJ6K1b8v5d3f9a2e1c7";

export default function CheckoutPage() {
  const [selectedMethod, setSelectedMethod] = useState("usdt");
  const [timeLeft, setTimeLeft] = useState(15 * 60 - 1);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const method = paymentMethods.find((m) => m.id === selectedMethod) ?? paymentMethods[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

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
            <p className="text-2xs text-drift-muted">Premium Membership</p>
            <h1 className="mt-1 text-sm font-semibold text-white">Premium Membership</h1>
            <p className="mt-1 text-2xs text-drift-muted">
              Access to premium content, features and exclusive benefits.
            </p>

            <ul className="mt-4 space-y-1.5 border-t border-drift-border pt-4">
              {checkoutFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-2xs text-drift-muted">
                  <span className="text-drift-green">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-drift-border pt-4">
              <p className="section-label">Amount due</p>
              <p className="text-lg font-semibold tabular-nums text-white">120.00 USDT</p>
              <p className="text-2xs text-drift-muted">≈ $120.00 USD</p>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            <div className="card p-4">
              <p className="section-label mb-2">Payment method</p>
              <div className="flex flex-wrap gap-1">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setSelectedMethod(pm.id)}
                    className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-2xs ${
                      selectedMethod === pm.id
                        ? "border-drift-purple bg-drift-hover text-white"
                        : "border-drift-border text-drift-muted hover:text-white"
                    }`}
                  >
                    <CryptoIcon symbol={pm.label} />
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="section-label mb-3">
                Pay with {method.label} ({method.network})
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-center border border-drift-border bg-white p-4">
                  <QRCodeSVG value={WALLET_ADDRESS} size={160} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-1 block">Wallet address</label>
                    <div className="flex items-center gap-2">
                      <code className="input flex-1 truncate font-mono text-2xs">
                        {WALLET_ADDRESS}
                      </code>
                      <button
                        onClick={() => handleCopy(WALLET_ADDRESS, "address")}
                        className="btn-secondary !px-2"
                      >
                        <Icon name="Copy" className="h-3 w-3" />
                      </button>
                    </div>
                    {copied === "address" && (
                      <p className="mt-1 text-2xs text-drift-green">Copied</p>
                    )}
                  </div>
                  <div>
                    <label className="section-label mb-1 block">Amount</label>
                    <div className="flex items-center gap-2">
                      <span className="input flex-1 text-xs">120.00 {method.label}</span>
                      <button
                        onClick={() => handleCopy(`120.00 ${method.label}`, "amount")}
                        className="btn-secondary !px-2"
                      >
                        <Icon name="Copy" className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="border border-drift-border bg-drift-bg p-2 text-2xs text-drift-muted">
                    Send only {method.label} on {method.network}. Other assets will be lost.
                  </p>
                </div>
              </div>
            </div>

            <div className="card flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-white">Awaiting payment</p>
                <p className="text-2xs text-drift-muted">
                  You will be redirected once confirmed.
                </p>
              </div>
              <div className="flex items-center gap-3 text-2xs">
                {["Pending", "Confirming", "Complete"].map((step, i) => (
                  <span
                    key={step}
                    className={i === 0 ? "text-white" : "text-drift-muted"}
                  >
                    {step}
                  </span>
                ))}
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
