"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";
import { PLATFORM_WALLET_NETWORKS } from "@/lib/constants";
import { blockExplorerAddressUrl } from "@/lib/utils";

interface PlatformWallet {
  id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  isActive: boolean;
  onChainBalance?: number | null;
  onChainError?: string;
  nativeGasBalance?: number | null;
  nativeGasSymbol?: string | null;
}

interface GasWalletStatus {
  configured: boolean;
  address: string | null;
  trxBalance: number;
  accountExists: boolean;
  ready: boolean;
  message: string;
  minTrxRequired: number;
  explorerUrl: string | null;
}

interface SplGasWalletStatus {
  configured: boolean;
  address: string | null;
  solBalance: number;
  ready: boolean;
  message: string;
  explorerUrl: string | null;
}

interface EvmGasWalletStatus {
  network: string;
  label: string;
  address: string;
  nativeSymbol: string;
  nativeBalance: number;
  ready: boolean;
  message: string;
  explorerUrl: string | null;
}

interface GasWalletResponse {
  tron: GasWalletStatus;
  spl: SplGasWalletStatus;
  evm: EvmGasWalletStatus[];
}

export default function AdminWalletsPage() {
  const { setOpen } = useAdminSidebar();
  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [gasWallets, setGasWallets] = useState<GasWalletResponse | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedGas, setCopiedGas] = useState(false);
  const [form, setForm] = useState({
    currency: "USDT",
    network: "SPL",
    address: "",
    label: "",
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError("");

    fetch("/api/admin/platform-wallets")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load platform wallets");
        }
        return r.json();
      })
      .then((platformData) => {
        setWallets(platformData.data ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load platform wallets"));

    fetch("/api/admin/gas-wallet")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load gas wallets");
        }
        return r.json();
      })
      .then((gasData) => {
        setGasWallets(gasData as GasWalletResponse);
      })
      .catch((err) => {
        setError((prev) => prev || (err instanceof Error ? err.message : "Failed to load gas wallets"));
      })
      .finally(() => setRefreshing(false));
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
        subtitle="Fee collection addresses — live on-chain balances shown below"
        onMenuClick={() => setOpen(true)}
        actions={
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary px-3 py-2 text-2xs"
          >
            {refreshing ? "Refreshing…" : "Refresh balances"}
          </button>
        }
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

        <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>Fee wallets</strong> collect the 1.5% platform USDT. <strong>Gas wallets</strong> hold
          small native-token floats (TRX, SOL, BNB, MATIC, etc.) for withdrawals — network fees are charged
          to merchants on withdrawal, not paid by the platform.
        </p>

        {gasWallets?.tron && (
          <section
            className={`card mb-4 p-4 ${
              gasWallets.tron.ready
                ? "border-drift-green/40"
                : gasWallets.tron.configured
                  ? "border-amber-500/40"
                  : "border-drift-red/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="section-title">Tron Gas Wallet (TRX) — Legacy only</h2>
                <p className="mt-1 text-2xs text-drift-muted">
                  Tron is retired for new merchants. This wallet only serves existing TRC20 withdrawals
                  and admin on-chain sweeps. Use{" "}
                  <a href="/admin/conversions" className="text-drift-purple hover:underline">
                    Conversions
                  </a>{" "}
                  to move ledger balances off Tron.
                </p>
                {gasWallets.tron.address ? (
                  <>
                    <p className="mt-3 break-all font-mono text-xs text-white">{gasWallets.tron.address}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-2xs">
                      <span className="text-white">
                        Balance:{" "}
                        <span
                          className={
                            gasWallets.tron.ready ? "font-semibold text-drift-green" : "font-semibold text-amber-400"
                          }
                        >
                          {gasWallets.tron.trxBalance.toFixed(2)} TRX
                        </span>
                      </span>
                      {gasWallets.tron.explorerUrl && (
                        <a
                          href={gasWallets.tron.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-drift-purple hover:underline"
                        >
                          View on Tronscan →
                        </a>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                {gasWallets.tron.address && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(gasWallets.tron.address!);
                      setCopiedGas(true);
                      setTimeout(() => setCopiedGas(false), 2000);
                    }}
                    className="btn-secondary px-3 py-2 text-2xs"
                  >
                    {copiedGas ? "Copied!" : "Copy address"}
                  </button>
                )}
              </div>
            </div>
            {!gasWallets.tron.ready && gasWallets.tron.configured && gasWallets.tron.address && (
              <p className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Send <strong>{gasWallets.tron.minTrxRequired}+ TRX</strong> to fund TRC20 withdrawals.
              </p>
            )}
          </section>
        )}

        {gasWallets?.spl && (
          <section
            className={`card mb-4 p-4 ${
              gasWallets.spl.ready
                ? "border-drift-green/40"
                : gasWallets.spl.configured
                  ? "border-amber-500/40"
                  : "border-drift-red/40"
            }`}
          >
            <h2 className="section-title">Solana Gas Wallet (SOL)</h2>
            <p className="mt-1 text-2xs text-drift-muted">{gasWallets.spl.message}</p>
            {gasWallets.spl.address && (
              <>
                <p className="mt-3 break-all font-mono text-xs text-white">{gasWallets.spl.address}</p>
                <p className="mt-2 text-2xs text-white">
                  Balance:{" "}
                  <span className={gasWallets.spl.ready ? "font-semibold text-drift-green" : "font-semibold text-amber-400"}>
                    {gasWallets.spl.solBalance.toFixed(4)} SOL
                  </span>
                </p>
              </>
            )}
          </section>
        )}

        {gasWallets?.evm && gasWallets.evm.length > 0 && (
          <section className="card mb-4 p-4">
            <h2 className="section-title mb-3">EVM Gas Wallets</h2>
            <div className="space-y-3">
              {gasWallets.evm.map((g) => (
                <div
                  key={g.network}
                  className={`rounded border p-3 ${
                    g.ready ? "border-drift-green/30" : "border-amber-500/30"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{g.label}</p>
                  <p className="mt-1 text-2xs text-drift-muted">{g.message}</p>
                  <p className="mt-2 break-all font-mono text-2xs text-drift-muted">{g.address}</p>
                  <p className="mt-1 text-2xs text-white">
                    Balance: {g.nativeBalance.toFixed(6)} {g.nativeSymbol}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mb-4 rounded border border-drift-border bg-drift-bg/50 px-3 py-2 text-sm text-drift-muted">
          <strong className="text-white">Platform fee wallets</strong> — where Drift sweeps the 1.5% USDT fee.
          Test payments sent here will not update merchant balances.
        </p>

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
                          <>
                            <p className="mt-1 break-all font-mono text-2xs text-drift-muted">
                              {wallet.address}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
                              <span className="text-white">
                                On-chain:{" "}
                                {wallet.onChainError ? (
                                  <span className="text-drift-red">{wallet.onChainError}</span>
                                ) : (
                                  <span className="font-semibold text-drift-green">
                                    {(wallet.onChainBalance ?? 0).toFixed(4)} {net.currency}
                                  </span>
                                )}
                              </span>
                              {wallet.nativeGasSymbol != null && wallet.nativeGasBalance != null && (
                                <span className="text-drift-muted">
                                  Gas: {wallet.nativeGasBalance.toFixed(4)} {wallet.nativeGasSymbol}
                                </span>
                              )}
                              <a
                                href={blockExplorerAddressUrl(wallet.address, net.network)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-drift-purple hover:underline"
                              >
                                View on explorer →
                              </a>
                            </div>
                          </>
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
