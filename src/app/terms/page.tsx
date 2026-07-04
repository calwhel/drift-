import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-[#1e1e2e] px-5 py-6 lg:px-8">
        <Link href="/">
          <LogoMark />
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">Last updated: July 4, 2026</p>

        <div className="prose prose-invert mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-[#d1d5db]">
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of Drift Payment (&quot;Drift&quot;, &quot;we&quot;,
            &quot;us&quot;). By creating an account or using our services, you agree to these Terms.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-white">1. Service</h2>
            <p>
              Drift provides tools for businesses to accept cryptocurrency payments, manage wallets, create payment
              links, and track transactions. We are a technology platform — we are not a bank, money transmitter, or
              financial advisor.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Eligibility</h2>
            <p>
              You must be at least 18 years old and legally able to enter contracts. You are responsible for
              compliance with laws in your jurisdiction regarding cryptocurrency.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Accounts &amp; security</h2>
            <p>
              You are responsible for safeguarding your login credentials and API keys. Enable two-factor
              authentication where available. Notify us promptly of unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Fees</h2>
            <p>
              Drift charges a platform fee on completed transactions as displayed in your dashboard (currently 1.5%
              unless otherwise stated). Network blockchain fees are separate and paid to miners/validators.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Cryptocurrency risks</h2>
            <p>
              Cryptocurrency transactions are irreversible. Sending to the wrong address or network may result in
              permanent loss. You accept volatility, regulatory, and technical risks of digital assets.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Prohibited use</h2>
            <p>
              You may not use Drift for illegal activity, fraud, money laundering, sanctions evasion, or any purpose
              that violates applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Limitation of liability</h2>
            <p>
              Drift is provided &quot;as is&quot;. To the maximum extent permitted by law, we are not liable for
              indirect, incidental, or consequential damages, including loss of funds due to user error, blockchain
              failures, or third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
            <p>
              Questions:{" "}
              <a href="mailto:support@driftpayment.io" className="text-[#a78bfa] hover:underline">
                support@driftpayment.io
              </a>
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-[#6b7280]">
          <Link href="/privacy" className="text-[#a78bfa] hover:underline">
            Privacy Policy
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
