import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LogoMark } from "@/components/landing/logo-mark";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { FloatingCoins } from "@/components/landing/floating-coins";
import { Icon } from "@/components/icons";
import { heroFeatures, landingFeatures, trustedLogos } from "@/lib/mock-data";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden bg-[#0a0a0f] text-white">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute right-0 top-0 h-[500px] w-full opacity-80 lg:h-[700px] lg:w-[700px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex max-w-[1280px] flex-col items-center gap-10 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
          {/* Left column */}
          <div className="w-full text-center lg:w-[520px] lg:shrink-0 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-[#7c3aed14] px-3 py-1.5">
              <Icon name="Zap" className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span className="text-[11px] text-[#c4b5fd] sm:text-[12px]">
                Modern Crypto Payments for Businesses
              </span>
            </div>

            <h1 className="mt-5 text-[36px] font-bold leading-[1.1] tracking-tight sm:mt-6 sm:text-[44px] lg:text-[56px] lg:leading-[1.08]">
              Accept Crypto.
              <br />
              <span className="text-[#7c3aed]">Grow Globally.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-relaxed text-[#9ca3af] sm:mt-5 sm:text-[16px] lg:mx-0">
              Drift Payment makes it easy for businesses to accept crypto payments,
              track transactions, and grow revenue.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 rounded bg-[#7c3aed] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#6d28d9]"
              >
                Get Started Free
                <span>→</span>
              </Link>
              <Link
                href="/pay/abc123"
                className="rounded border border-[#2a2a38] px-5 py-2.5 text-center text-[14px] font-medium text-white hover:border-[#3f3f50] hover:bg-[#111118]"
              >
                View Demo
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:flex sm:flex-wrap sm:justify-center sm:gap-6 lg:justify-start">
              {heroFeatures.map((f) => (
                <div key={f.label} className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <Icon name={f.icon as "Code"} className="h-3.5 w-3.5 shrink-0 text-[#7c3aed]" />
                  <span className="text-[11px] text-[#9ca3af] sm:text-[12px]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — mockup */}
          <div className="relative w-full max-w-[580px] lg:flex-1" style={{ perspective: "1400px" }}>
            <FloatingCoins />
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-[#1e1e2e] py-8 sm:py-10">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.15em] text-[#6b7280] sm:text-[11px]">
          Trusted by businesses worldwide
        </p>
        <div className="mx-auto mt-5 flex max-w-[1280px] flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4 sm:mt-7 sm:gap-10 sm:px-6 lg:px-8">
          {trustedLogos.map((logo) => (
            <span key={logo} className="text-[12px] font-semibold text-[#4b5563] sm:text-[14px]">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-[26px] font-bold tracking-tight text-white sm:text-[32px] lg:text-[36px]">
            Everything you need to manage{" "}
            <span className="text-[#7c3aed]">crypto payments</span>
          </h2>
          <p className="mt-2 text-[14px] text-[#9ca3af] sm:mt-3 sm:text-[15px]">
            Powerful tools for modern businesses
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-4">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border border-[#1e1e2e] bg-[#111118] p-5 text-left transition-colors hover:border-[#2a2a38]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded border border-[#7c3aed33] bg-[#7c3aed14]">
                  <Icon name={feature.icon as "Grid3x3"} className="h-4 w-4 text-[#7c3aed]" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#9ca3af]">{feature.description}</p>
                <div className="mt-4">
                  <Icon
                    name="ArrowUpRight"
                    className="h-4 w-4 text-[#6b7280] transition-colors group-hover:text-[#7c3aed]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="scroll-mt-16 border-t border-[#1e1e2e] py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1280px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-[22px] font-bold text-white sm:text-[28px]">
            Ready to accept crypto payments?
          </h2>
          <p className="mt-2 text-[14px] text-[#9ca3af] sm:text-[15px]">
            Join thousands of businesses already using Drift Payment.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex items-center gap-2 rounded bg-[#7c3aed] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#6d28d9] sm:mt-6"
          >
            Get Started Free
            <Icon name="ArrowUpRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="flex flex-col items-center border-t border-[#1e1e2e] py-8 text-center">
        <LogoMark />
        <p className="mt-3 text-[12px] text-[#6b7280]">© 2024 Drift Payment. All rights reserved.</p>
      </footer>
    </div>
  );
}
