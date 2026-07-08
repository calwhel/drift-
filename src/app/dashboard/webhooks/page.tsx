"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";

type WebhookRow = { id: string; url: string; events: string[]; createdAt: string };
type DeliveryRow = {
  id: string;
  webhookId: string;
  status: string;
  attempts: string;
  lastError: string | null;
  payload: { event?: string };
  deliveredAt: string | null;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  createdAt: string;
};

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [url, setUrl] = useState("https://your-api.com/webhooks/drift");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/webhooks")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to load webhooks");
        }
        return r.json();
      })
      .then(setHooks)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load webhooks"));

  const loadDeliveries = () =>
    fetch("/api/webhooks/deliveries?limit=30")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to load webhook deliveries");
        }
        return r.json();
      })
      .then((data) => setDeliveries(data.deliveries ?? []))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load webhook deliveries")
      );

  useEffect(() => {
    load();
    loadDeliveries();
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
    loadDeliveries();
  }

  async function retryDelivery(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/webhooks/deliveries/${id}/retry`, { method: "POST" });
      if (res.ok) loadDeliveries();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <>
      <DashboardHeader title="Webhooks" subtitle="Receive transaction status updates" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {loadError && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {loadError}
          </p>
        )}
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

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent deliveries</h2>
            <button onClick={loadDeliveries} className="text-2xs text-drift-purple hover:underline">
              Refresh
            </button>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-2xs">
              <thead className="border-b border-drift-border text-drift-muted">
                <tr>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Attempts</th>
                  <th className="px-4 py-2">Last attempt</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-drift-border">
                {deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2 text-white">{d.payload?.event ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          d.status === "delivered"
                            ? "text-drift-green"
                            : d.status === "failed"
                              ? "text-drift-red"
                              : "text-drift-muted"
                        }
                      >
                        {d.status}
                      </span>
                      {d.lastError && (
                        <p className="mt-0.5 max-w-xs truncate text-drift-red" title={d.lastError}>
                          {d.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-drift-muted">{d.attempts}</td>
                    <td className="px-4 py-2 text-drift-muted">
                      {d.lastAttemptAt
                        ? new Date(d.lastAttemptAt).toLocaleString()
                        : new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {d.status === "failed" && (
                        <button
                          onClick={() => retryDelivery(d.id)}
                          disabled={retryingId === d.id}
                          className="text-drift-purple hover:underline disabled:opacity-50"
                        >
                          {retryingId === d.id ? "Retrying…" : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deliveries.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-drift-muted">No deliveries yet</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
