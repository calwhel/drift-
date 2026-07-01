"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<Array<{ id: string; url: string; events: string[]; createdAt: string }>>([]);
  const [url, setUrl] = useState("https://your-api.com/webhooks/drift");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/webhooks")
      .then((r) => (r.ok ? r.json() : []))
      .then(setHooks)
      .catch(() => setHooks([]));

  useEffect(() => {
    load();
  }, []);

  async function createWebhook() {
    setError("");
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        events: ["transaction.completed", "transaction.confirming"],
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create webhook");
      return;
    }
    const data = await res.json();
    setSecret(data.secret);
    load();
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Remove this webhook endpoint?")) return;
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to delete webhook");
      return;
    }
    load();
  }

  return (
    <>
      <DashboardHeader title="Webhooks" subtitle="Receive transaction status updates" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}
        {secret && (
          <div className="card mb-4 border-drift-purple/30 p-4">
            <p className="text-sm font-medium text-white">Webhook secret — save for signature verification</p>
            <code className="mt-2 block break-all rounded bg-drift-bg p-3 text-xs text-drift-green">{secret}</code>
            <p className="mt-2 text-2xs text-drift-muted">
              Verify with HMAC-SHA256 of body using X-Drift-Signature header
            </p>
          </div>
        )}
        <div className="card p-4">
          <label className="section-label mb-1 block">Endpoint URL</label>
          <div className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="input flex-1" />
            <button onClick={createWebhook} className="btn-primary">
              Add webhook
            </button>
          </div>
        </div>
        <div className="card mt-4 divide-y divide-drift-border">
          {hooks.map((h) => (
            <div key={h.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{h.url}</p>
                <p className="text-2xs text-drift-muted">{(h.events as string[]).join(", ")}</p>
                <p className="mt-1 text-2xs text-drift-muted">
                  Added {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteWebhook(h.id)}
                className="btn-ghost shrink-0 text-drift-red"
                aria-label="Delete webhook"
              >
                <Icon name="X" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {hooks.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-drift-muted">No webhooks configured yet</p>
          )}
        </div>
      </main>
    </>
  );
}
