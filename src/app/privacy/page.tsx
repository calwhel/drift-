import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-[#1e1e2e] px-5 py-6 lg:px-8">
        <Link href="/">
          <LogoMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">Last updated: July 4, 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[#d1d5db]">
          <p>
            Drift Payment (&quot;Drift&quot;) respects your privacy. This policy describes what we collect and how we
            use it when you use our website and payment platform.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-white">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account data: email, business name, password (hashed), optional 2FA secrets</li>
              <li>Transaction data: payment amounts, wallet addresses, blockchain transaction hashes</li>
              <li>Technical data: IP address, browser type, logs for security and debugging</li>
              <li>Support messages you submit through the dashboard</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">How we use information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Provide and secure the payment platform</li>
              <li>Detect payments on-chain and credit merchant balances</li>
              <li>Send admin alerts (e.g. Telegram) for signups, payments, and support requests</li>
              <li>Improve reliability and prevent abuse</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">What we do not do</h2>
            <p>
              We do not sell your personal information. We do not store your blockchain private keys in plain text
              — custodial keys are encrypted at rest.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Third parties</h2>
            <p>
              We use infrastructure providers (e.g. hosting, database) and public blockchain APIs (TronGrid,
              Etherscan, Solana RPC) to operate the service. On-chain transactions are public by nature.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Data retention</h2>
            <p>
              We retain account and transaction records while your account is active and as required for legal,
              accounting, or security purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Your rights</h2>
            <p>
              You may request access, correction, or deletion of your account data by contacting{" "}
              <a href="mailto:support@driftpayment.io" className="text-[#a78bfa] hover:underline">
                support@driftpayment.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p>
              Privacy questions:{" "}
              <a href="mailto:support@driftpayment.io" className="text-[#a78bfa] hover:underline">
                support@driftpayment.io
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[#6b7280]">
          <Link href="/terms" className="text-[#a78bfa] hover:underline">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/" className="text-[#a78bfa] hover:underline">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
