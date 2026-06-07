import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";
import { HeroMockup } from "@/components/landing/hero-mockup";
import { FloatingCoins } from "@/components/landing/floating-coins";
import { Icon } from "@/components/icons";
import { heroFeatures, landingFeatures, trustedLogos } from "@/lib/mock-data";

export default function LandingPage() {
  return (
    <div className="min-w-[1280px] bg-[#0a0a0f] text-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-[1280px] items-center px-8">
          <LogoMark />

          <div className="flex flex-1 items-center justify-center gap-8">
            <a href="#features" className="text-[13px] text-[#9ca3af] transition-colors hover:text-white">
              Features
            </a>
            <Link href="/dashboard" className="text-[13px] text-[#9ca3af] transition-colors hover:text-white">
              Developers
            </Link>
            <a href="#pricing" className="text-[13px] text-[#9ca3af] transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#features" className="flex items-center gap-1 text-[13px] text-[#9ca3af] transition-colors hover:text-white">
              Resources
              <Icon name="ChevronDown" className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="text-[13px] text-[#9ca3af] transition-colors hover:text-white">
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded bg-[#7c3aed] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#6d28d9]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Purple radial glow — right side */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px]"
          style={{
            background: "radial-gradient(circle at center, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto flex w-[1280px] items-center gap-12 px-8 pb-20 pt-16">
          {/* Left column */}
          <div className="w-[520px] shrink-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-[#7c3aed14] px-3.5 py-1.5">
              <Icon name="Zap" className="h-3.5 w-3.5 text-[#7c3aed]" />
              <span className="text-[12px] text-[#c4b5fd]">Modern Crypto Payments for Businesses</span>
            </div>

            <h1 className="mt-6 text-[56px] font-bold leading-[1.08] tracking-tight">
              Accept Crypto.
              <br />
              <span className="text-[#7c3aed]">Grow Globally.</span>
            </h1>

            <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-[#9ca3af]">
              Drift Payment makes it easy for businesses to accept crypto payments,
              track transactions, and grow revenue.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/dashboard"
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

            <div className="mt-10 flex items-center gap-6">
              {heroFeatures.map((f) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  <Icon name={f.icon as "Code"} className="h-3.5 w-3.5 text-[#7c3aed]" />
                  <span className="text-[12px] text-[#9ca3af]">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — mockup */}
          <div className="relative flex flex-1 items-center justify-center" style={{ perspective: "1400px" }}>
            <FloatingCoins />
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="border-y border-[#1e1e2e] py-10">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.15em] text-[#6b7280]">
          Trusted by businesses worldwide
        </p>
        <div className="mx-auto mt-7 flex w-[1280px] items-center justify-center gap-10 px-8">
          {trustedLogos.map((logo) => (
            <span key={logo} className="text-[14px] font-semibold text-[#4b5563]">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="scroll-mt-16 py-20">
        <div className="mx-auto w-[1280px] px-8 text-center">
          <h2 className="text-[36px] font-bold tracking-tight text-white">
            Everything you need to manage{" "}
            <span className="text-[#7c3aed]">crypto payments</span>
          </h2>
          <p className="mt-3 text-[15px] text-[#9ca3af]">Powerful tools for modern businesses</p>

          <div className="mt-12 grid grid-cols-4 gap-5">
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

      {/* ── CTA ── */}
      <section id="pricing" className="scroll-mt-16 border-t border-[#1e1e2e] py-20">
        <div className="mx-auto w-[1280px] px-8 text-center">
          <h2 className="text-[28px] font-bold text-white">Ready to accept crypto payments?</h2>
          <p className="mt-2 text-[15px] text-[#9ca3af]">
            Join thousands of businesses already using Drift Payment.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded bg-[#7c3aed] px-6 py-2.5 text-[14px] font-medium text-white hover:bg-[#6d28d9]"
          >
            Get Started Free
            <Icon name="ArrowUpRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex flex-col items-center border-t border-[#1e1e2e] py-8 text-center">
        <LogoMark />
        <p className="mt-3 text-[12px] text-[#6b7280]">© 2024 Drift Payment. All rights reserved.</p>
      </footer>
    </div>
  );
}
