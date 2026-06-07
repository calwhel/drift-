"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";

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
      <DashboardHeader title="Payment links" subtitle="Create a shareable payment link" />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="card p-4 lg:col-span-3">
            <div className="space-y-4">
              <div>
                <label className="section-label mb-1 block">Product name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="section-label mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="input w-full resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-1 block">Amount</label>
                  <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-full">
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="section-label">Expiry</label>
                  <button
                    onClick={() => setExpiryEnabled(!expiryEnabled)}
                    className={`h-4 w-7 rounded-sm transition-colors ${expiryEnabled ? "bg-drift-purple" : "bg-drift-border"}`}
                  >
                    <span
                      className={`block h-3 w-3 rounded-sm bg-white transition-transform ${expiryEnabled ? "translate-x-3.5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
                {expiryEnabled && (
                  <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input w-full">
                    <option>7 days</option>
                    <option>14 days</option>
                    <option>30 days</option>
                    <option>Never</option>
                  </select>
                )}
              </div>
              <div>
                <label className="section-label mb-1 block">Redirect URL</label>
                <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} className="input w-full" />
              </div>
              <button onClick={() => router.push("/pay/abc123")} className="btn-primary w-full py-2">
                Create link
              </button>
            </div>
          </div>

          <div className="card p-4 lg:col-span-2">
            <p className="section-label mb-3">Preview</p>
            <div className="border border-drift-border bg-drift-bg p-4">
              <p className="text-sm font-medium text-white">{name}</p>
              <p className="mt-0.5 text-2xs text-drift-muted">{description}</p>
              <p className="mt-3 text-xl font-semibold tabular-nums text-white">
                {amount} {currency}
              </p>
              <div className="mx-auto mt-4 w-fit border border-drift-border bg-white p-3">
                <QRCodeSVG value={paymentUrl} size={140} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link href="/pay/abc123" className="input flex-1 truncate py-1 text-2xs text-drift-muted">
                  {paymentUrl}
                </Link>
                <button onClick={handleCopy} className="btn-secondary flex items-center gap-1">
                  <Icon name="Copy" className="h-3 w-3" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
