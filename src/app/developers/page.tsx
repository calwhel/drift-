import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";

const endpoints = [
  { method: "POST", path: "/api/payment-links", desc: "Create a payment link" },
  { method: "GET", path: "/api/payment-links", desc: "List payment links" },
  { method: "GET", path: "/api/payment-links/:id", desc: "Get a payment link" },
  { method: "PATCH", path: "/api/payment-links/:id", desc: "Update a payment link" },
  { method: "DELETE", path: "/api/payment-links/:id", desc: "Deactivate a payment link" },
  { method: "GET", path: "/api/transactions", desc: "List transactions (paginated)" },
  { method: "GET", path: "/api/wallets", desc: "Get wallet balances" },
  { method: "POST", path: "/api/withdrawals", desc: "Request a withdrawal" },
  { method: "POST", path: "/api/invoices", desc: "Create an invoice with payment link" },
  { method: "POST", path: "/api/subscriptions", desc: "Create a subscription" },
  { method: "POST", path: "/api/webhooks", desc: "Register a webhook endpoint" },
  { method: "POST", path: "/api/api-keys", desc: "Generate an API key" },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <LandingNavbar />
      <main className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <h1 className="text-2xl font-bold text-white">Drift Payment API</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Accept crypto payments programmatically. Authenticate with{" "}
          <code className="rounded bg-[#111118] px-1.5 py-0.5 text-[#7c3aed]">Authorization: Bearer drift_...</code>
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Quick start</h2>
          <pre className="mt-3 overflow-x-auto rounded border border-[#1e1e2e] bg-[#111118] p-4 text-xs text-[#9ca3af]">
{`curl -X POST https://your-app.railway.app/api/payment-links \\
  -H "Authorization: Bearer drift_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Order #1234","amount":99.99,"currency":"USDT","wallet_id":"<wallet-uuid>"}'`}
          </pre>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Get a valid <code className="text-[#7c3aed]">wallet_id</code> from{" "}
            <code className="text-[#7c3aed]">GET /api/wallets</code> first.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">TypeScript SDK</h2>
          <pre className="mt-3 overflow-x-auto rounded border border-[#1e1e2e] bg-[#111118] p-4 text-xs text-[#9ca3af]">
{`import { DriftClient } from "@/sdk";

const drift = new DriftClient({
  apiKey: process.env.DRIFT_API_KEY!,
  baseUrl: "https://your-app.railway.app",
});

const link = await drift.paymentLinks.create({
  title: "Order #1234",
  amount: 99.99,
  currency: "USDT",
  wallet_id: "<wallet-uuid>",
});`}
          </pre>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Webhooks</h2>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Drift sends POST requests with an <code className="text-[#7c3aed]">X-Drift-Signature</code> HMAC-SHA256 header.
            Verify using your webhook secret:
          </p>
          <pre className="mt-3 overflow-x-auto rounded border border-[#1e1e2e] bg-[#111118] p-4 text-xs text-[#9ca3af]">
{`import { createHmac } from "crypto";

function verify(secret: string, body: string, signature: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}`}
          </pre>
          <p className="mt-2 text-sm text-[#9ca3af]">Payload includes <code className="text-[#7c3aed]">event</code>, <code className="text-[#7c3aed]">transaction_id</code>, <code className="text-[#7c3aed]">status</code>, <code className="text-[#7c3aed]">amount</code>, <code className="text-[#7c3aed]">fee</code>, and <code className="text-[#7c3aed]">net_amount</code>.</p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Endpoints</h2>
          <div className="mt-4 space-y-2">
            {endpoints.map((ep) => (
              <div key={ep.path + ep.method} className="flex items-start gap-3 rounded border border-[#1e1e2e] bg-[#111118] px-4 py-3">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium ${
                  ep.method === "GET" ? "bg-blue-500/20 text-blue-400" :
                  ep.method === "POST" ? "bg-green-500/20 text-green-400" :
                  ep.method === "PATCH" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                }`}>{ep.method}</span>
                <div>
                  <code className="text-xs text-white">{ep.path}</code>
                  <p className="mt-0.5 text-2xs text-[#9ca3af]">{ep.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link href="/auth/signup" className="rounded bg-[#7c3aed] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#6d28d9]">
            Get API keys →
          </Link>
        </div>
      </main>
    </div>
  );
}
