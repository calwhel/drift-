"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DashboardHeader } from "@/components/dashboard/header";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USDT", "BTC", "USDC", "ETH", "SOL"];
const EXPIRY_OPTIONS = ["1 day", "7 days", "14 days", "30 days", "Never"];

export default function PaymentLinksPage() {
  const [name, setName] = useState("Premium Membership");
  const [description, setDescription] = useState("Access to premium content and features.");
  const [amount, setAmount] = useState("120.00");
  const [currency, setCurrency] = useState("USDT");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiryOn, setExpiryOn] = useState(true);
  const [expiry, setExpiry] = useState("7 days");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const linkUrl = "drift.to/pay/abc123";

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${linkUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DashboardHeader
        title="Create Payment Link"
        subtitle="Create a link and start accepting payments in minutes."
        actions={
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-drift-border bg-drift-card text-drift-muted hover:text-white">
            <Icon name="Sun" className="h-[18px] w-[18px]" />
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_400px]">
          {/* Form */}
          <div className="card-elevated p-6">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">Product / Service Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">
                  Description <span className="text-drift-muted">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">Amount</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white focus:border-[#7c3aed] focus:outline-none"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCurrencyOpen((v) => !v)}
                      className="flex w-[120px] items-center gap-2 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5 text-[14px] text-white"
                    >
                      <CryptoIcon symbol={currency} size="xs" />
                      <span className="flex-1 text-left">{currency}</span>
                      <Icon name="ChevronDown" className="h-4 w-4 text-drift-muted" />
                    </button>
                    {currencyOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-[120px] overflow-hidden rounded-lg border border-drift-border bg-drift-card py-1 shadow-lg">
                        {CURRENCIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCurrency(c);
                              setCurrencyOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white hover:bg-white/5"
                          >
                            <CryptoIcon symbol={c} size="xs" />
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-white">
                    Set Expiry <span className="text-drift-muted">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpiryOn((v) => !v)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      expiryOn ? "bg-[#7c3aed]" : "bg-[#2a2a38]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                        expiryOn ? "translate-x-[22px]" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                {expiryOn && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExpiryOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white"
                    >
                      {expiry}
                      <Icon name="ChevronDown" className="h-4 w-4 text-drift-muted" />
                    </button>
                    {expiryOpen && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-drift-border bg-drift-card py-1 shadow-lg">
                        {EXPIRY_OPTIONS.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => {
                              setExpiry(o);
                              setExpiryOpen(false);
                            }}
                            className="flex w-full px-3.5 py-2 text-[13px] text-white hover:bg-white/5"
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">
                  Redirect URL <span className="text-drift-muted">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://yoursite.com/success"
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <button className="w-full rounded-lg bg-[#7c3aed] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#6d28d9]">
                Create Link
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-white">Preview</p>
            <div className="card-elevated p-6 text-center">
              <h3 className="text-[18px] font-bold text-white">{name || "Product Name"}</h3>
              {description && (
                <p className="mx-auto mt-1.5 max-w-[240px] text-[13px] leading-snug text-drift-muted">
                  {description}
                </p>
              )}
              <p className="mt-5 text-2xl font-bold tabular-nums text-white">
                {amount || "0.00"} {currency}
              </p>
              <div className="mx-auto mt-5 flex w-[200px] items-center justify-center rounded-2xl bg-white p-4">
                <QRCodeSVG value={`https://${linkUrl}`} size={168} />
              </div>
              <div className="mt-5 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5 text-[13px] text-white">
                {linkUrl}
              </div>
              <button
                onClick={copyLink}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-drift-border bg-drift-card py-2.5 text-[13px] font-medium text-white hover:bg-white/5"
              >
                <Icon name={copied ? "Check" : "Copy"} className="h-4 w-4" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Secure banner */}
        <div className="card-elevated mt-5 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl tile-purple">
              <Icon name="ShieldCheck" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-white">Secure &amp; Reliable</p>
              <p className="text-[12px] text-drift-muted">
                Your payments are secured with industry-leading encryption and monitored 24/7.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2 text-[12px] text-white">
              <Icon name="CheckCircle" className="h-4 w-4 text-drift-green" />
              Instant Settlements
            </span>
            <span className="flex items-center gap-2 text-[12px] text-white">
              <Icon name="Lock" className="h-4 w-4 text-[#60a5fa]" />
              256-bit Encryption
            </span>
            <span className="flex items-center gap-2 text-[12px] text-white">
              <Icon name="RefreshCw" className="h-4 w-4 text-[#a78bfa]" />
              24/7 Support
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
