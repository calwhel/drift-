"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Array<{ id: string; name: string; keyPrefix: string; createdAt: string }>>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("Production");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = () => fetch("/api/api-keys").then((r) => r.json()).then(setKeys);

  useEffect(() => { load(); }, []);

  async function createKey() {
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setNewKey(data.api_key);
    load();
  }

  async function revokeKey(id: string, keyName: string) {
    if (!confirm(`Revoke API key "${keyName}"? Integrations using it will stop working immediately.`)) {
      return;
    }

    setRevokingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) load();
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <>
      <DashboardHeader title="API Keys" subtitle="Authenticate programmatic payment link creation" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {newKey && (
          <div className="card mb-4 border-drift-purple/30 p-4">
            <p className="text-sm font-medium text-white">Copy your API key — shown once</p>
            <code className="mt-2 block break-all rounded bg-drift-bg p-3 text-xs text-drift-green">{newKey}</code>
          </div>
        )}
        <div className="card p-4">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input flex-1" placeholder="Key name" />
            <button onClick={createKey} className="btn-primary">Generate key</button>
          </div>
        </div>
        <div className="card mt-4 divide-y divide-drift-border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="text-white">{k.name}</p>
                <p className="font-mono text-2xs text-drift-muted">{k.keyPrefix}…</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xs text-drift-muted">{new Date(k.createdAt).toLocaleDateString()}</p>
                <button
                  type="button"
                  onClick={() => revokeKey(k.id, k.name)}
                  disabled={revokingId === k.id}
                  className="text-2xs text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {revokingId === k.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
