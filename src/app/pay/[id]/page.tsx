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
      {/* Top bar */}
      <header className="border-b border-drift-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-sm">
            <Icon name="Clock" className="h-4 w-4 text-drift-purple" />
            <span className="text-drift-muted">Time Left to Pay</span>
            <span className="font-mono font-bold text-drift-purple">{timeDisplay}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Icon name="Shield" className="h-4 w-4 text-drift-green" />
            <div className="hidden sm:block">
              <p className="font-medium text-white">Secure Payment</p>
              <p className="text-xs text-drift-muted">256-bit Encrypted</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Order Summary */}
          <div className="rounded-2xl border border-drift-border bg-drift-card p-6 lg:col-span-2">
            <div className="flex h-40 items-center justify-center rounded-xl bg-drift-bg">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-drift-purple/20 shadow-glow-sm">
                  <Icon name="Crown" className="h-10 w-10 text-drift-purple" />
                </div>
                <div className="absolute -right-2 -top-2 h-4 w-4 rounded bg-drift-purple-light opacity-60" />
                <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded bg-drift-purple opacity-40" />
              </div>
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-drift-purple/10 px-3 py-1 text-xs font-medium text-drift-purple">
              <Icon name="Crown" className="h-3 w-3" />
              Premium Access
            </div>

            <h1 className="mt-3 text-xl font-bold text-white">Premium Membership</h1>
            <p className="mt-1 text-sm text-drift-muted">
              Access to premium content, features and exclusive benefits.
            </p>

            <ul className="mt-4 space-y-2">
              {checkoutFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-drift-muted">
                  <Icon name="Check" className="h-4 w-4 text-drift-purple" />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-drift-border bg-drift-bg p-4">
              <p className="text-sm text-drift-muted">Total Amount</p>
              <p className="mt-1 text-2xl font-bold text-white">120.00 USDT</p>
              <p className="text-sm text-drift-muted">≈ $120.00 USD</p>
            </div>
          </div>

          {/* Payment Interface */}
          <div className="space-y-4 lg:col-span-3">
            {/* Payment Method Tabs */}
            <div className="rounded-2xl border border-drift-border bg-drift-card p-5">
              <h2 className="mb-4 font-semibold text-white">Choose Payment Method</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setSelectedMethod(pm.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                      selectedMethod === pm.id
                        ? "border-drift-purple bg-drift-purple/10"
                        : "border-drift-border hover:border-drift-border/80"
                    }`}
                  >
                    {selectedMethod === pm.id && (
                      <Icon name="Check" className="absolute right-2 top-2 h-3.5 w-3.5 text-drift-purple" />
                    )}
                    <CryptoIcon symbol={pm.label} size="md" />
                    <span className="text-xs font-medium text-white">{pm.label}</span>
                    <span className="text-[10px] text-drift-muted">{pm.network}</span>
                  </button>
                ))}
                <button className="flex flex-col items-center justify-center gap-1 rounded-xl border border-drift-border p-3 text-drift-muted hover:text-white">
                  <Icon name="MoreHorizontal" className="h-5 w-5" />
                  <span className="text-xs">More</span>
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="rounded-2xl border border-drift-border bg-drift-card p-5">
              <h2 className="mb-4 font-semibold text-white">
                Pay with {method.label} ({method.network})
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex items-center justify-center rounded-xl bg-white p-6 shadow-glow-sm">
                  <QRCodeSVG value={WALLET_ADDRESS} size={180} />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-drift-muted">
                      Or Send to Wallet Address
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5">
                      <span className="flex-1 truncate font-mono text-xs text-white">
                        {WALLET_ADDRESS}
                      </span>
                      <button
                        onClick={() => handleCopy(WALLET_ADDRESS, "address")}
                        className="text-drift-purple hover:text-drift-purple-light"
                      >
                        <Icon name="Copy" className="h-4 w-4" />
                      </button>
                    </div>
                    {copied === "address" && (
                      <p className="mt-1 text-xs text-drift-green">Copied!</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-drift-muted">Amount</label>
                    <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5">
                      <span className="flex-1 text-sm text-white">120.00 {method.label}</span>
                      <button
                        onClick={() => handleCopy(`120.00 ${method.label}`, "amount")}
                        className="text-drift-purple hover:text-drift-purple-light"
                      >
                        <Icon name="Copy" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-drift-purple/20 bg-drift-purple/5 p-3">
                    <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-drift-purple" />
                    <p className="text-xs text-drift-muted">
                      Send only {method.label} ({method.network}) to this address. Sending any
                      other coin may result in permanent loss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status */}
            <div className="rounded-2xl border border-drift-border bg-drift-card p-5">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-drift-purple/10">
                    <Icon name="Loader2" className="h-5 w-5 animate-spin text-drift-purple" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Waiting for Payment</p>
                    <p className="text-sm text-drift-muted">
                      Once we confirm your payment, you will be redirected automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[
                    { label: "Pending", icon: "Wallet", active: true },
                    { label: "Confirming", icon: "Link2", active: false },
                    { label: "Completed", icon: "CheckCircle2", active: false },
                  ].map((step, i) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            step.active
                              ? "bg-drift-purple text-white"
                              : "border border-drift-border text-drift-muted"
                          }`}
                        >
                          <Icon name={step.icon as "Wallet"} className="h-4 w-4" />
                        </div>
                        <span className={`text-[10px] ${step.active ? "text-drift-purple" : "text-drift-muted"}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < 2 && (
                        <div className="mb-4 h-px w-8 border-t border-dashed border-drift-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-drift-border py-6 text-center">
        <p className="text-sm text-drift-muted">
          Powered by <span className="font-semibold text-white">Drift Payment</span>
        </p>
        <p className="mt-1 text-xs text-drift-muted">Fast • Secure • Global</p>
        <button className="mt-2 text-xs text-drift-purple hover:underline">
          Need Help? Contact Support
        </button>
      </footer>
    </div>
  );
}
