"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { LogoMark } from "@/components/landing/logo-mark";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { getNetworkLabel } from "@/lib/constants";
import { checkoutFeatures, demoCheckout } from "@/lib/mock-data";

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
}

const STEPS = [
  { key: "pending", label: "Pending", icon: "Loader2" as const },
  { key: "confirming", label: "Confirming", icon: "RefreshCw" as const },
  { key: "completed", label: "Completed", icon: "Check" as const },
];

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const shortcode = params.shortcode as string;
  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [timeLeft, setTimeLeft] = useState(899);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payment-links/public/${shortcode}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: PaymentLinkData) => {
        setLink(data);
        if (data.expiry) {
          const remaining = Math.max(0, Math.floor((new Date(data.expiry).getTime() - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
        if (data.status === "paid") setPaymentStatus("completed");
      })
      .catch(() => {
        setLink({
          title: demoCheckout.title,
          description: demoCheckout.description,
          amount: demoCheckout.amount,
          currency: demoCheckout.currency,
          network: demoCheckout.network,
          deposit_address: demoCheckout.deposit_address,
          redirect_url: null,
          expiry: null,
          status: "active",
        });
      });
  }, [shortcode]);

  const pollStatus = useCallback(() => {
    fetch(`/api/payment-links/public/${shortcode}/status`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.status) return;
        setPaymentStatus(data.status);
        if (data.status === "completed" && data.redirect_url) {
          setTimeout(() => router.push(data.redirect_url), 2000);
        }
      })
      .catch(() => {});
  }, [shortcode, router]);

  useEffect(() => {
    if (!link || paymentStatus === "completed") return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [link, paymentStatus, pollStatus]);

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

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080d] text-drift-muted">
        Loading…
      </div>
    );
  }

  const activeStepIndex = STEPS.findIndex((s) => s.key === paymentStatus);
  const networkLabel = getNetworkLabel(link.currency, link.network);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08080d] py-8 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, rgba(124,58,237,0.18) 0%, transparent 50%), radial-gradient(ellipse at 90% 10%, rgba(124,58,237,0.12) 0%, transparent 45%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl px-4">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-drift-border bg-[#0d0d15] lg:grid-cols-[360px_1fr]">
          {/* Left product panel */}
          <div className="border-b border-drift-border p-6 lg:border-b-0 lg:border-r">
            <LogoMark />

            <div
              className="relative mt-6 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-[#7c3aed40]"
              style={{
                background:
                  "radial-gradient(circle at 50% 60%, rgba(124,58,237,0.45) 0%, rgba(124,58,237,0.12) 40%, transparent 70%)",
              }}
            >
              <Icon name="Crown" className="h-20 w-20 text-[#c4b5fd] drop-shadow-[0_8px_24px_rgba(124,58,237,0.6)]" />
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#7c3aed40] bg-[#7c3aed1f] px-3 py-1 text-[11px] font-medium text-[#c4b5fd]">
              <Icon name="Crown" className="h-3.5 w-3.5" />
              {demoCheckout.badge}
            </div>

            <h1 className="mt-3 text-[22px] font-bold tracking-tight text-white">{link.title}</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-drift-muted">{link.description}</p>

            <ul className="mt-4 space-y-2.5">
              {checkoutFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-white">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e1f]">
                    <Icon name="Check" className="h-3 w-3 text-[#4ade80]" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-xl border border-drift-border bg-drift-bg p-4">
              <p className="text-[12px] text-drift-muted">Total Amount</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                {link.amount} <span className="text-base font-semibold text-drift-muted">{link.currency}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-drift-muted">{networkLabel}</p>
              <p className="text-[12px] text-drift-muted">≈ ${demoCheckout.usdApprox} USD</p>
            </div>
          </div>

          {/* Right payment panel */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="Clock" className="h-4 w-4 text-[#a78bfa]" />
                <span className="text-[12px] text-drift-muted">Time Left to Pay</span>
                <span className="font-mono text-[15px] font-semibold tabular-nums text-white">{timeDisplay}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-drift-muted">
                <Icon name="ShieldCheck" className="h-4 w-4 text-drift-green" />
                <span className="font-medium text-white">Secure Payment</span>
                256-bit Encrypted
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#7c3aed40] bg-[#7c3aed14] px-4 py-3">
              <CryptoIcon symbol={link.currency} size="sm" />
              <div>
                <p className="text-[14px] font-semibold text-white">
                  Pay with {link.currency}
                </p>
                <p className="text-[12px] text-[#c4b5fd]">{networkLabel}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-drift-border bg-drift-bg p-5">
              <p className="text-[14px] font-semibold text-white">
                Send {link.currency} on {networkLabel}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[160px_1fr]">
                <div>
                  <p className="mb-2 text-[12px] text-drift-muted">Scan QR Code</p>
                  <div className="flex items-center justify-center rounded-xl bg-white p-3">
                    <QRCodeSVG value={link.deposit_address} size={128} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-[12px] text-drift-muted">Or Send to Wallet Address</p>
                    <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2.5">
                      <code className="flex-1 truncate font-mono text-[12px] text-white">{link.deposit_address}</code>
                      <button onClick={() => handleCopy(link.deposit_address, "address")} className="text-drift-muted hover:text-white">
                        <Icon name={copied === "address" ? "Check" : "Copy"} className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12px] text-drift-muted">Amount</p>
                    <div className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2.5">
                      <span className="flex-1 text-[13px] tabular-nums text-white">
                        {link.amount} {link.currency}
                      </span>
                      <button onClick={() => handleCopy(`${link.amount} ${link.currency}`, "amount")} className="text-drift-muted hover:text-white">
                        <Icon name={copied === "amount" ? "Check" : "Copy"} className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-[#7c3aed40] bg-[#7c3aed14] px-3 py-2.5">
                    <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" />
                    <p className="text-[11px] leading-relaxed text-[#c4b5fd]">
                      Send only {link.currency} ({networkLabel}) to this address. Sending any other coin or using the wrong
                      network may result in permanent loss.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status tracker */}
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-drift-border bg-drift-bg p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#7c3aed] text-[#a78bfa]">
                  <Icon name="Loader2" className="h-5 w-5 animate-spin" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {paymentStatus === "completed" ? "Payment Received" : "Waiting for Payment"}
                  </p>
                  <p className="text-[12px] text-drift-muted">
                    Once we confirm your payment, you will be redirected automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {STEPS.map((step, i) => {
                  const reached = i <= (activeStepIndex < 0 ? 0 : activeStepIndex);
                  return (
                    <div key={step.key} className="flex items-center gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full border text-[12px]",
                            reached ? "border-[#7c3aed] bg-[#7c3aed29] text-[#c4b5fd]" : "border-drift-border text-drift-muted"
                          )}
                        >
                          <Icon name={step.icon} className={cn("h-4 w-4", step.key === "pending" && reached && "animate-spin")} />
                        </span>
                        <span className={cn("text-[10px]", reached ? "text-white" : "text-drift-muted")}>{step.label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <span className="h-px w-6 border-t border-dashed border-drift-border" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-[12px] text-drift-muted">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="text-drift-border">|</span>
            <LogoMark />
          </div>
          <div className="flex items-center gap-2">
            <span>Fast • Secure • Global</span>
            <span className="text-drift-border">|</span>
            <span>Need Help?</span>
            <a href="/developers" className="font-medium text-[#a78bfa] hover:underline">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
