import Link from "next/link";
import { Logo } from "@/components/logo";
import { heroFeatures, landingFeatures, trustedLogos } from "@/lib/mock-data";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-drift-bg">
      <nav className="border-b border-drift-border">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-xs text-drift-muted hover:text-white">Features</a>
            <Link href="/dashboard" className="text-xs text-drift-muted hover:text-white">Developers</Link>
            <a href="#pricing" className="text-xs text-drift-muted hover:text-white">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs text-drift-muted hover:text-white">Sign in</Link>
            <Link href="/dashboard" className="btn-primary">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="border-b border-drift-border px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-2xs font-medium uppercase tracking-widest text-drift-muted">
            Crypto payments infrastructure
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Accept crypto. Get paid globally.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-drift-muted">
            Payment processing, wallet management, and checkout — built for businesses
            that need reliable crypto infrastructure.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary px-4 py-2">Start accepting payments</Link>
            <Link href="/pay/abc123" className="btn-secondary px-4 py-2">View checkout</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {heroFeatures.map((f) => (
              <span key={f.label} className="text-2xs text-drift-muted">{f.label}</span>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl border border-drift-border bg-drift-card">
          <div className="flex border-b border-drift-border">
            <div className="hidden w-36 shrink-0 border-r border-drift-border p-3 sm:block">
              <p className="text-2xs font-medium text-white">Drift</p>
              {["Overview", "Transactions", "Links", "Wallets"].map((item, i) => (
                <p key={item} className={`mt-1 text-2xs ${i === 0 ? "text-white" : "text-drift-muted"}`}>
                  {item}
                </p>
              ))}
            </div>
            <div className="flex-1 p-3">
              <div className="flex divide-x divide-drift-border border border-drift-border">
                {[
                  { label: "Gross", value: "$24,560" },
                  { label: "Payments", value: "356" },
                  { label: "Completed", value: "342" },
                  { label: "Pending", value: "14" },
                ].map((s) => (
                  <div key={s.label} className="flex-1 px-3 py-2">
                    <p className="text-2xs text-drift-muted">{s.label}</p>
                    <p className="text-xs font-semibold tabular-nums text-white">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 h-20 border border-drift-border bg-drift-bg">
                <div className="flex h-full items-end gap-px px-2 pb-2">
                  {[35, 50, 42, 65, 55, 72, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-drift-purple/30" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-drift-border py-8">
        <p className="mb-4 text-center text-2xs uppercase tracking-widest text-drift-muted">
          Trusted by teams worldwide
        </p>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-4">
          {trustedLogos.map((logo) => (
            <span key={logo} className="text-xs text-drift-muted/60">{logo}</span>
          ))}
        </div>
      </section>

      <section id="features" className="scroll-mt-12 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Everything to run crypto payments
          </h2>
          <p className="mt-1 text-sm text-drift-muted">
            APIs, dashboards, and checkout — one platform.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-px border border-drift-border bg-drift-border sm:grid-cols-2 lg:grid-cols-4">
            {landingFeatures.map((feature) => (
              <div key={feature.title} className="bg-drift-card p-4">
                <p className="text-xs font-medium text-white">{feature.title}</p>
                <p className="mt-1 text-2xs leading-relaxed text-drift-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-12 border-t border-drift-border px-4 py-16">
        <div className="mx-auto max-w-lg border border-drift-border bg-drift-card p-8 text-center">
          <h2 className="text-lg font-semibold text-white">Start accepting payments</h2>
          <p className="mt-1 text-sm text-drift-muted">No setup fees. 1% per transaction.</p>
          <Link href="/dashboard" className="btn-primary mt-5 inline-block px-5 py-2">
            Create account
          </Link>
        </div>
      </section>

      <footer className="border-t border-drift-border py-6 text-center text-2xs text-drift-muted">
        <Logo className="mx-auto mb-3 justify-center" size="sm" showSubtitle={false} />
        <p>© 2024 Drift Payment</p>
      </footer>
    </div>
  );
}
