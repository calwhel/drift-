"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";
import { PLATFORM_WALLET_NETWORKS } from "@/lib/constants";

interface PlatformWallet {
  id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  isActive: boolean;
}

export default function AdminWalletsPage() {
  const { setOpen } = useAdminSidebar();
  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    currency: "USDT",
    network: "TRC20",
    address: "",
    label: "",
  });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/platform-wallets")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load wallets");
        }
        return r.json();
      })
      .then((d) => setWallets(d.data ?? []))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  function selectNetwork(currency: string, network: string) {
    const existing = wallets.find((w) => w.currency === currency && w.network === network);
    setForm({
      currency,
      network,
      address: existing?.address ?? "",
      label: existing?.label ?? PLATFORM_WALLET_NETWORKS.find((n) => n.currency === currency && n.network === network)?.label ?? "",
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/platform-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save wallet");
      setSuccess(`Saved ${form.currency} (${form.network}) fee wallet`);
      selectNetwork(form.currency, form.network);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this platform wallet?")) return;
    const res = await fetch(`/api/admin/platform-wallets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Delete failed");
      return;
    }
    load();
  }

  return (
    <>
      <DashboardHeader
        title="Platform Wallets"
        subtitle="Fee collection addresses — 1.5% of each completed transaction routes here"
        onMenuClick={() => setOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
            {success}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <h2 className="section-title mb-3">Configured Wallets</h2>
            <div className="space-y-2">
              {PLATFORM_WALLET_NETWORKS.map((net) => {
                const wallet = wallets.find(
                  (w) => w.currency === net.currency && w.network === net.network
                );
                return (
                  <div
                    key={`${net.currency}-${net.network}`}
                    className="rounded border border-drift-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{net.label}</p>
                        {wallet ? (
                          <p className="mt-1 break-all font-mono text-2xs text-drift-muted">
                            {wallet.address}
                          </p>
                        ) : (
                          <p className="mt-1 text-2xs text-drift-red">Not configured</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => selectNetwork(net.currency, net.network)}
                          className="btn-secondary px-2 py-1 text-2xs"
                        >
                          {wallet ? "Edit" : "Add"}
                        </button>
                        {wallet && (
                          <button
                            type="button"
                            onClick={() => handleDelete(wallet.id)}
                            className="btn-ghost px-2 py-1 text-2xs text-drift-red"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="section-title mb-3">
              {form.address ? "Edit" : "Add"} Platform Wallet
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="section-label mb-1 block">Network</label>
                <select
                  className="input w-full"
                  value={`${form.currency}|${form.network}`}
                  onChange={(e) => {
                    const [currency, network] = e.target.value.split("|");
                    selectNetwork(currency, network);
                  }}
                >
                  {PLATFORM_WALLET_NETWORKS.map((net) => (
                    <option key={`${net.currency}-${net.network}`} value={`${net.currency}|${net.network}`}>
                      {net.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="section-label mb-1 block">Label</label>
                <input
                  className="input w-full"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Main USDT fee wallet"
                />
              </div>
              <div>
                <label className="section-label mb-1 block">Wallet Address</label>
                <input
                  className="input w-full font-mono text-xs"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Enter wallet address"
                  required
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2">
                {saving ? "Saving…" : "Save Wallet"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
