import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon } from "@/components/icons";

export default function DemoCheckoutPage() {
  const demoAddress = "TExampleDriftDemoWalletAddress123456789";

  return (
    <div className="min-h-screen bg-drift-bg text-white">
      <div className="border-b border-drift-border bg-[#0a0a0f]/80 px-4 py-3 text-center">
        <p className="text-sm text-amber-200">
          <strong>Demo checkout</strong> — this is a preview only. No real payment will be processed.{" "}
          <Link href="/auth/signup" className="text-[#a78bfa] underline">
            Sign up free
          </Link>{" "}
          to accept live payments.
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <LogoMark />
          <span className="rounded-full border border-[#7c3aed40] bg-[#7c3aed14] px-3 py-1 text-xs text-[#c4b5fd]">
            Preview
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-drift-muted">Order summary</p>
            <h1 className="mt-2 text-xl font-bold">Premium Subscription</h1>
            <p className="mt-2 text-sm text-drift-muted">
              Monthly access to your product or service — exactly what your customers see at checkout.
            </p>
            <div className="mt-5 rounded-xl border border-drift-border bg-drift-bg p-4">
              <p className="text-xs text-drift-muted">Total</p>
              <p className="mt-1 text-2xl font-bold">
                49.00 <span className="text-base text-drift-muted">USDT</span>
              </p>
              <p className="text-xs text-drift-muted">TRC20 (Tron)</p>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 rounded-xl border border-[#7c3aed40] bg-[#7c3aed14] px-4 py-3">
              <CryptoIcon symbol="USDT" size="sm" />
              <div>
                <p className="font-semibold">Pay with USDT</p>
                <p className="text-xs text-[#c4b5fd]">TRC20 (Tron)</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <p className="mb-1 text-xs text-drift-muted">Deposit address (example)</p>
                <code className="block truncate rounded-lg border border-drift-border bg-drift-card px-3 py-2 font-mono text-xs">
                  {demoAddress}
                </code>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-[#7c3aed40] bg-[#7c3aed14] px-3 py-2">
                <Icon name="Info" className="mt-0.5 h-4 w-4 shrink-0 text-[#a78bfa]" />
                <p className="text-xs text-[#c4b5fd]">
                  Live checkouts show a real QR code and wallet address. Payments are detected automatically within
                  ~1–2 minutes.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-drift-muted">
              <Icon name="Loader2" className="h-4 w-4 animate-spin text-[#a78bfa]" />
              Waiting for payment (demo)
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-6 py-3 font-semibold hover:bg-[#6d28d9]"
          >
            Start accepting payments
            <Icon name="ArrowUpRight" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
