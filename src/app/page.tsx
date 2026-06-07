import Link from "next/link";
import { Logo } from "@/components/logo";
import { Icon } from "@/components/icons";
import {
  heroFeatures,
  landingFeatures,
  trustedLogos,
} from "@/lib/mock-data";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-drift-bg bg-gradient-hero">
      {/* Navbar */}
      <nav className="border-b border-drift-border/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-drift-muted hover:text-white">Features</a>
            <Link href="/dashboard" className="text-sm text-drift-muted hover:text-white">Developers</Link>
            <a href="#pricing" className="text-sm text-drift-muted hover:text-white">Pricing</a>
            <a href="#features" className="flex items-center gap-1 text-sm text-drift-muted hover:text-white">
              Resources
              <Icon name="ChevronDown" className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-drift-muted hover:text-white">
              Login
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-drift-purple px-4 py-2 text-sm font-medium text-white hover:bg-drift-purple/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-drift-border bg-drift-card px-4 py-1.5 text-sm text-drift-muted">
            <Icon name="Zap" className="h-4 w-4 text-drift-purple" />
            Modern Crypto Payments for Businesses
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Accept Crypto.
            <br />
            <span className="bg-gradient-purple bg-clip-text text-transparent">
              Grow Globally.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-drift-muted">
            The easiest way to accept cryptocurrency payments. Integrate in minutes,
            get paid instantly, and scale your business worldwide.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-drift-purple px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:bg-drift-purple/90"
            >
              Get Started Free
              <Icon name="ArrowUpRight" className="h-4 w-4" />
            </Link>
            <Link
              href="/pay/abc123"
              className="rounded-lg border border-drift-border px-6 py-3 text-sm font-semibold text-white hover:bg-drift-card"
            >
              View Demo
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {heroFeatures.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm text-drift-muted">
                <Icon name={f.icon as "Code"} className="h-4 w-4 text-drift-purple" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-drift-border bg-drift-card shadow-glow">
            <div className="flex items-center gap-2 border-b border-drift-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-drift-red/60" />
              <div className="h-3 w-3 rounded-full bg-drift-orange/60" />
              <div className="h-3 w-3 rounded-full bg-drift-green/60" />
            </div>
            <div className="flex">
              <div className="hidden w-48 shrink-0 border-r border-drift-border bg-drift-bg p-4 sm:block">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-drift-purple text-xs font-bold text-white">D</div>
                  <span className="text-xs font-bold text-white">DRIFT</span>
                </div>
                {["Overview", "Transactions", "Payment Links", "Wallets"].map((item, i) => (
                  <div
                    key={item}
                    className={`mb-1 rounded px-2 py-1.5 text-xs ${i === 0 ? "bg-drift-purple text-white" : "text-drift-muted"}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-4">
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "Total Gross", value: "$24,560" },
                    { label: "Payments", value: "356" },
                    { label: "Completed", value: "342" },
                    { label: "Pending", value: "14" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-drift-border bg-drift-bg p-3">
                      <p className="text-[10px] text-drift-muted">{s.label}</p>
                      <p className="text-sm font-bold text-white">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-drift-border bg-drift-bg p-3 sm:col-span-2">
                    <p className="mb-2 text-[10px] text-drift-muted">Revenue Overview</p>
                    <div className="flex h-16 items-end gap-1">
                      {[40, 55, 45, 70, 60, 80, 90].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-drift-purple/40"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-drift-border bg-drift-bg p-3">
                    <p className="mb-2 text-[10px] text-drift-muted">Payment Methods</p>
                    <div className="mx-auto h-12 w-12 rounded-full border-4 border-drift-green border-r-drift-orange border-b-blue-500 border-l-drift-purple" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-drift-border/50 py-12">
        <p className="mb-8 text-center text-xs font-medium tracking-widest text-drift-muted">
          TRUSTED BY BUSINESSES WORLDWIDE
        </p>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-4 opacity-50 grayscale">
          {trustedLogos.map((logo) => (
            <span key={logo} className="text-sm font-semibold text-drift-muted">
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Everything you need to manage{" "}
            <span className="text-drift-purple">crypto payments</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-drift-muted">
            Powerful tools to accept, track, and manage cryptocurrency payments for your business.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-drift-border bg-drift-card p-6 text-left transition-colors hover:border-drift-purple/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-drift-purple/10">
                  <Icon name={feature.icon as "Grid3x3"} className="h-5 w-5 text-drift-purple" />
                </div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-drift-muted">{feature.description}</p>
                <div className="mt-4">
                  <Icon name="ArrowUpRight" className="h-4 w-4 text-drift-muted transition-colors group-hover:text-drift-purple" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="scroll-mt-16 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-drift-border bg-drift-card p-10 text-center shadow-glow">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to accept crypto payments?
          </h2>
          <p className="mt-3 text-drift-muted">
            Join thousands of businesses already using Drift Payment.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-drift-purple px-8 py-3 text-sm font-semibold text-white hover:bg-drift-purple/90"
          >
            Get Started Free
            <Icon name="ArrowUpRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-drift-border py-8 text-center text-sm text-drift-muted">
        <Logo className="mx-auto mb-4 justify-center" size="sm" />
        <p>© 2024 Drift Payment. All rights reserved.</p>
      </footer>
    </div>
  );
}
