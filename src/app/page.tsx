import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LogoMark } from "@/components/landing/logo-mark";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { FloatingCoins } from "@/components/landing/floating-coins";
import { Icon } from "@/components/icons";
import { heroFeatures, landingFeatures, trustedLogos } from "@/lib/mock-data";

function TrustedLogosMarquee() {
  const logos = [...trustedLogos, ...trustedLogos];

  return (
    <div className="relative mt-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0a0f] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0a0f] to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-12 px-4">
        {logos.map((logo, i) => (
          <span
            key={`${logo.name}-${i}`}
            className="flex shrink-0 items-center gap-2.5 text-[15px] font-semibold text-[#4b5563]"
          >
            <Icon name={logo.icon as "Coins"} className="h-[18px] w-[18px]" />
            {logo.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <LandingNavbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Purple radial glow — right side */}
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[900px] w-[900px] opacity-90"
          style={{
            background:
              "radial-gradient(circle at 55% 45%, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0.12) 30%, rgba(99,102,241,0.06) 50%, transparent 72%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-1/4 h-[500px] w-[500px] lg:hidden"
          style={{
            background:
              "radial-gradient(circle at center, rgba(124,58,237,0.2) 0%, transparent 65%)",
          }}
        />

        <div className="relative mx-auto max-w-[1280px] px-5 pb-16 pt-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed40] bg-[#7c3aed18] px-4 py-1.5">
              <Icon name="Zap" className="h-3.5 w-3.5 text-[#a855f7]" />
              <span className="text-[13px] font-medium text-[#c4b5fd]">
                Modern Crypto Payments for Businesses
              </span>
            </div>

            <h1 className="mt-7 text-[42px] font-bold leading-[1.05] tracking-tight sm:text-[48px] lg:text-[58px]">
              Accept Crypto.
              <br />
              <span className="text-gradient-brand">Grow Globally.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-[460px] text-[17px] leading-relaxed text-[#9ca3af] lg:mx-0">
              Drift Payment makes it easy for businesses to accept crypto payments,
              track transactions, and grow revenue.
            </p>

            {/* Buttons — always side by side */}
            <div className="mt-9 flex flex-row items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(124,58,237,0.4)] transition-colors hover:bg-[#6d28d9]"
              >
                Get Started Free
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/pay/abc123"
                className="inline-flex items-center rounded-lg border border-[#2a2a38] bg-transparent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:border-[#3f3f50] hover:bg-[#111118]"
              >
                View Demo
              </Link>
            </div>

            {/* Trust badges — single horizontal row */}
            <div className="scrollbar-hide mt-10 flex flex-nowrap items-center justify-start gap-6 overflow-x-auto lg:gap-8">
              {heroFeatures.map((f) => (
                <div key={f.label} className="flex shrink-0 items-center gap-2">
                  <Icon name={f.icon as "Puzzle"} className="h-4 w-4 text-[#a855f7]" />
                  <span className="whitespace-nowrap text-[13px] text-[#9ca3af]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mockup + coins */}
          <div className="relative mt-14 flex justify-center lg:mt-0 lg:justify-end">
            <div
              className="relative"
              style={{ perspective: "1400px" }}
            >
              <div
                className="absolute left-1/2 top-1/2 -z-10 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0.1) 45%, transparent 70%)",
                }}
              />
              <FloatingCoins />
              <div className="origin-center scale-[0.58] sm:scale-[0.72] lg:scale-100">
                <HeroMockup
                  style={{
                    transform: "perspective(1400px) rotateY(-14deg) rotateX(8deg)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ── */}
      <section className="border-y border-[#1e1e2e] py-12">
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            Trusted by businesses worldwide
          </p>
          <TrustedLogosMarquee />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-20 py-20 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-5 text-center lg:px-8">
          <h2 className="text-[32px] font-bold tracking-tight text-white lg:text-[40px]">
            Everything you need to manage{" "}
            <span className="text-gradient-brand">crypto payments</span>
          </h2>
          <p className="mt-4 text-[16px] text-[#9ca3af]">Powerful tools for modern businesses</p>

          {/* Mobile: horizontal scroll row */}
          <div className="scrollbar-hide mt-12 flex gap-4 overflow-x-auto pb-2 lg:hidden">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group w-[260px] shrink-0 rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#7c3aed33] bg-[#7c3aed14]">
                  <Icon name={feature.icon as "Grid3x3"} className="h-5 w-5 text-[#a855f7]" />
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9ca3af]">{feature.description}</p>
                <div className="mt-6">
                  <Icon
                    name="ArrowUpRight"
                    className="h-4 w-4 text-[#6b7280] transition-colors group-hover:text-[#a855f7]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: feature cards */}
          <div className="mt-14 hidden gap-5 sm:grid-cols-2 lg:grid xl:grid-cols-5">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-[#1e1e2e] bg-[#111118] p-6 text-left transition-colors hover:border-[#2a2a38]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#7c3aed33] bg-[#7c3aed14]">
                  <Icon name={feature.icon as "Grid3x3"} className="h-5 w-5 text-[#a855f7]" />
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-white">{feature.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#9ca3af]">{feature.description}</p>
                <div className="mt-8">
                  <Icon
                    name="ArrowUpRight"
                    className="h-4 w-4 text-[#6b7280] transition-colors group-hover:text-[#a855f7]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="get-started" className="scroll-mt-20 border-t border-[#1e1e2e] py-20 lg:py-28">
        <div className="mx-auto max-w-[1280px] px-5 text-center lg:px-8">
          <h2 className="text-[32px] font-bold text-white lg:text-[36px]">Ready to accept crypto payments?</h2>
          <p className="mt-3 text-[16px] text-[#9ca3af]">
            No monthly fees. Start free and only pay a small fee per transaction.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-7 py-3 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(124,58,237,0.35)] hover:bg-[#6d28d9]"
          >
            Get Started Free
            <Icon name="ArrowUpRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="flex flex-col items-center border-t border-[#1e1e2e] py-10 text-center">
        <LogoMark />
        <p className="mt-4 text-[13px] text-[#6b7280]">© 2024 Drift Payment. All rights reserved.</p>
      </footer>
    </div>
  );
}
