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
  const [redirectUrl, setRedirectUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description,
        amount: Number(amount),
        currency,
        redirect_url: redirectUrl || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) return;
    const link = await res.json();
    setCheckoutUrl(`${window.location.origin}/pay/${link.shortCode}`);
    setDepositAddress(link.depositAddress);
    router.push(`/pay/${link.shortCode}`);
  };

  const handleCopy = () => {
    if (!checkoutUrl) return;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = checkoutUrl || `drift.to/pay/preview`;
  const qrValue = depositAddress || previewUrl;

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
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input w-full resize-none" />
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
                    <option value="ETH">ETH</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label mb-1 block">Redirect URL (optional)</label>
                <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} className="input w-full" placeholder="https://yoursite.com/success" />
              </div>
              <button onClick={handleCreate} disabled={loading} className="btn-primary w-full py-2">
                {loading ? "Creating…" : "Create link"}
              </button>
            </div>
          </div>
          <div className="card p-4 lg:col-span-2">
            <p className="section-label mb-3">Preview</p>
            <div className="border border-drift-border bg-drift-bg p-4">
              <p className="text-sm font-medium text-white">{name}</p>
              <p className="mt-0.5 text-2xs text-drift-muted">{description}</p>
              <p className="mt-3 text-xl font-semibold tabular-nums text-white">{amount} {currency}</p>
              <div className="mx-auto mt-4 w-fit border border-drift-border bg-white p-3">
                <QRCodeSVG value={qrValue} size={140} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {checkoutUrl ? (
                  <Link href={checkoutUrl.replace(window.location.origin, "")} className="input flex-1 truncate py-1 text-2xs text-drift-purple">
                    {checkoutUrl}
                  </Link>
                ) : (
                  <span className="input flex-1 truncate py-1 text-2xs text-drift-muted">{previewUrl}</span>
                )}
                <button onClick={handleCopy} disabled={!checkoutUrl} className="btn-secondary flex items-center gap-1">
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
