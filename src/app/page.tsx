import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LogoMark } from "@/components/landing/logo-mark";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { FloatingCoins } from "@/components/landing/floating-coins";
import { Icon } from "@/components/icons";
import { heroFeatures, landingFeatures, trustedLogos } from "@/lib/mock-data";

export default function LandingPage() {
  return (
    <div className="bg-[#0a0a0f] text-white lg:min-w-[1280px]">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute right-0 top-0 hidden h-[700px] w-[700px] lg:block"
          style={{
            background:
              "radial-gradient(circle at center, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-[400px] w-full lg:hidden"
          style={{
            background:
              "radial-gradient(circle at 80% 30%, rgba(124,58,237,0.15) 0%, transparent 60%)",
          }}
        />

        <div className="relative mx-auto flex flex-col items-center gap-10 px-4 pb-12 pt-10 lg:w-[1280px] lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16">
          {/* Left column — desktop styles unchanged at lg+ */}
          <div className="w-full text-center lg:w-[520px] lg:shrink-0 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-[#7c3aed14] px-3.5 py-1.5">
              <Icon name="Zap" className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span className="text-[12px] text-[#c4b5fd]">Modern Crypto Payments for Businesses</span>
            </div>

            <h1 className="mt-6 text-[40px] font-bold leading-[1.08] tracking-tight lg:text-[56px]">
              Accept Crypto.
              <br />
              <span className="text-[#7c3aed]">Grow Globally.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-[440px] text-[16px] leading-relaxed text-[#9ca3af] lg:mx-0">
              Drift Payment makes it easy for businesses to accept crypto payments,
              track transactions, and grow revenue.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-center lg:justify-start">
              <Link
                href="/auth/signup"
                className="flex items-center gap-2 rounded bg-[#7c3aed] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#6d28d9]"
              >
                Get Started Free
                <span>→</span>
              </Link>
              <Link
                href="/pay/abc123"
                className="rounded border border-[#2a2a38] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:border-[#3f3f50] hover:bg-[#111118]"
              >
                View Demo
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start lg:gap-6">
              {heroFeatures.map((f) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  <Icon name={f.icon as "Code"} className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-[12px] text-[#9ca3af]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — mockup */}
          {/* Mobile: flat mockup below text */}
          <div className="flex w-full justify-center overflow-hidden lg:hidden">
            <div className="origin-top scale-[0.62]">
              <HeroMockup />
            </div>
          </div>

          {/* Desktop: exact original — tilt, coins, perspective */}
          <div
            className="relative hidden flex-1 items-center justify-center lg:flex"
            style={{ perspective: "1400px" }}
          >
            <FloatingCoins />
            <HeroMockup
              style={{ transform: "perspective(1400px) rotateY(-12deg) rotateX(6deg)" }}
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-[#1e1e2e] py-10">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.15em] text-[#6b7280]">
          Trusted by businesses worldwide
        </p>

        {/* Mobile: horizontal scroll */}
        <div className="mt-7 overflow-x-auto px-4 lg:hidden">
          <div className="flex w-max gap-8 pb-1">
            {trustedLogos.map((logo) => (
              <span key={logo} className="shrink-0 text-[14px] font-semibold text-[#4b5563]">
                {logo}
              </span>
            ))}
          </div>
        </div>

        {/* Desktop: exact original */}
        <div className="mx-auto mt-7 hidden w-[1280px] items-center justify-center gap-10 px-8 lg:flex">
          {trustedLogos.map((logo) => (
            <span key={logo} className="text-[14px] font-semibold text-[#4b5563]">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 py-20">
        <div className="mx-auto px-4 text-center lg:w-[1280px] lg:px-8">
          <h2 className="text-[28px] font-bold tracking-tight text-white lg:text-[36px]">
            Everything you need to manage{" "}
            <span className="text-[#7c3aed]">crypto payments</span>
          </h2>
          <p className="mt-3 text-[15px] text-[#9ca3af]">Powerful tools for modern businesses</p>

          {/* Mobile: 2x2 grid */}
          <div className="mt-10 grid grid-cols-2 gap-4 lg:hidden">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border border-[#1e1e2e] bg-[#111118] p-4 text-left"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded border border-[#7c3aed33] bg-[#7c3aed14]">
                  <Icon name={feature.icon as "Grid3x3"} className="h-4 w-4 text-[#7c3aed]" />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#9ca3af]">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Desktop: exact original 4-col row */}
          <div className="mt-12 hidden grid-cols-4 gap-5 lg:grid">
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
                <div className="mt-5">
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

      {/* CTA — desktop exact at lg+ */}
      <section id="pricing" className="scroll-mt-16 border-t border-[#1e1e2e] py-20">
        <div className="mx-auto px-4 text-center lg:w-[1280px] lg:px-8">
          <h2 className="text-[28px] font-bold text-white">Ready to accept crypto payments?</h2>
          <p className="mt-2 text-[15px] text-[#9ca3af]">
            Join thousands of businesses already using Drift Payment.
          </p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-flex items-center gap-2 rounded bg-[#7c3aed] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#6d28d9]"
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
