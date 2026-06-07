"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";
import { CryptoIcon } from "@/components/crypto-icon";

export default function PaymentLinksPage() {
  const router = useRouter();
  const [name, setName] = useState("Premium Membership");
  const [description, setDescription] = useState("Access to premium content and features.");
  const [amount, setAmount] = useState("120.00");
  const [currency, setCurrency] = useState("USDT");
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  const [expiry, setExpiry] = useState("7 days");
  const [redirectUrl, setRedirectUrl] = useState("https://yoursite.com/success");
  const [copied, setCopied] = useState(false);

  const paymentUrl = "drift.to/pay/abc123";

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DashboardHeader
        title="Create Payment Link"
        subtitle="Create a link and start accepting payments in minutes."
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-xl border border-drift-border bg-drift-card p-6 lg:col-span-3">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm text-drift-muted">Product / Service Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-4 py-2.5 text-sm text-white focus:border-drift-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-drift-muted">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-drift-border bg-drift-bg px-4 py-2.5 text-sm text-white focus:border-drift-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-drift-muted">Amount</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 rounded-lg border border-drift-border bg-drift-bg px-4 py-2.5 text-sm text-white focus:border-drift-purple focus:outline-none"
                  />
                  <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-bg px-3">
                    <CryptoIcon symbol={currency} />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none"
                    >
                      <option value="USDT">USDT</option>
                      <option value="BTC">BTC</option>
                      <option value="USDC">USDC</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-drift-muted">Set Expiry (Optional)</label>
                  <button
                    onClick={() => setExpiryEnabled(!expiryEnabled)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${expiryEnabled ? "bg-drift-purple" : "bg-drift-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${expiryEnabled ? "left-5" : "left-0.5"}`}
                    />
                  </button>
                </div>
                {expiryEnabled && (
                  <select
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full rounded-lg border border-drift-border bg-drift-bg px-4 py-2.5 text-sm text-white focus:border-drift-purple focus:outline-none"
                  >
                    <option>7 days</option>
                    <option>14 days</option>
                    <option>30 days</option>
                    <option>Never</option>
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-drift-muted">Redirect URL (Optional)</label>
                <input
                  type="url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-4 py-2.5 text-sm text-white focus:border-drift-purple focus:outline-none"
                />
              </div>

              <button
                onClick={() => router.push("/pay/abc123")}
                className="w-full rounded-lg bg-drift-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-drift-purple/90"
              >
                Create Link
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-drift-border bg-drift-card p-6 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-white">Preview</h3>
            <div className="rounded-xl border border-drift-border bg-drift-bg p-6 text-center">
              <h4 className="text-lg font-bold text-white">{name}</h4>
              <p className="mt-1 text-sm text-drift-muted">{description}</p>
              <p className="mt-4 text-3xl font-bold text-white">
                {amount} {currency}
              </p>
              <div className="mx-auto mt-6 flex w-fit items-center justify-center rounded-xl bg-white p-4">
                <QRCodeSVG value={paymentUrl} size={160} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href="/pay/abc123"
                  className="flex-1 truncate rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-xs text-drift-purple hover:underline"
                >
                  {paymentUrl}
                </Link>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-drift-purple px-3 py-2 text-xs font-medium text-drift-purple hover:bg-drift-purple/10"
                >
                  <Icon name="Copy" className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-drift-border bg-drift-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-drift-purple/10">
              <Icon name="Shield" className="h-5 w-5 text-drift-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Secure & Reliable</h3>
              <p className="mt-0.5 text-sm text-drift-muted">
                Your payments are secured with industry-leading encryption and monitored 24/7.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Instant Settlements", icon: "CheckCircle", color: "text-drift-green" },
              { label: "256-bit Encryption", icon: "Shield", color: "text-drift-purple" },
              { label: "24/7 Support", icon: "Headphones", color: "text-blue-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-drift-muted">
                <Icon name={item.icon as "CheckCircle"} className={`h-4 w-4 ${item.color}`} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
