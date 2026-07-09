"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";
import {
  getNetworkLabel,
  isMerchantNetworkEnabled,
  isLegacyTronNetwork,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string;
  businessName: string;
}

interface WalletRow {
  id: string;
  currency: string;
  network: string;
  balance: string;
  walletType: string;
  label: string | null;
  address: string;
  isCustodial?: boolean;
  hasPrivateKey?: boolean;
}

interface TransferRow {
  transfer: {
    id: string;
    debitAmount: string;
    creditAmount: string;
    fromCurrency: string;
    toCurrency: string;
    fromNetwork: string;
    toNetwork: string;
    createdBy: string;
    note: string | null;
    createdAt: string;
  };
  userEmail: string;
}

interface LegacyTronWallet {
  id: string;
  userId: string;
  userEmail: string;
  currency: string;
  address: string;
  ledgerBalance: number;
  onChainBalance: number;
  onChainError?: string;
  nativeGas?: { amount: number; symbol: string } | null;
  walletType?: string;
}

interface ConversionQuote {
  debitAmount: number;
  creditAmount: number;
  feeAmount: number;
  exchangeRate: number;
}

export default function AdminConversionsPage() {
  const { setOpen } = useAdminSidebar();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [legacyWallets, setLegacyWallets] = useState<LegacyTronWallet[]>([]);
  const [userWallets, setUserWallets] = useState<WalletRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [sweepLoading, setSweepLoading] = useState<string | null>(null);

  const [form, setForm] = useState({
    userId: "",
    fromWalletId: "",
    toWalletId: "",
    amount: "",
    note: "",
    force: true,
  });
  const [quote, setQuote] = useState<ConversionQuote | null>(null);

  const [sweepForm, setSweepForm] = useState<Record<string, { toAddress: string; amount: string }>>(
    {}
  );

  /** Sources: any custodial wallet including legacy TRC20 */
  const sourceWallets = useMemo(
    () =>
      userWallets.filter(
        (w) =>
          w.isCustodial === true ||
          w.walletType === "generated" ||
          w.hasPrivateKey === true ||
          isLegacyTronNetwork(w.network)
      ),
    [userWallets]
  );

  /** Destinations: active merchant networks only (no TRC20) */
  const destWallets = useMemo(
    () =>
      userWallets.filter(
        (w) =>
          w.id !== form.fromWalletId &&
          isMerchantNetworkEnabled(w.currency, w.network) &&
          (w.isCustodial === true || w.walletType === "generated" || w.hasPrivateKey === true)
      ),
    [userWallets, form.fromWalletId]
  );

  const fromWallet = sourceWallets.find((w) => w.id === form.fromWalletId);
  const needsForce =
    fromWallet != null &&
    isLegacyTronNetwork(fromWallet.network) &&
    Number(fromWallet.balance) > 0;

  const load = useCallback(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setUsers(d.data ?? []))
      .catch(() => setUsers([]));

    fetch("/api/admin/conversions")
      .then((r) => (r.ok ? r.json() : { transfers: [] }))
      .then((d) => setTransfers(d.transfers ?? []))
      .catch(() => setTransfers([]));

    fetch("/api/admin/treasury/legacy-tron")
      .then((r) => (r.ok ? r.json() : { wallets: [] }))
      .then((d) => setLegacyWallets(d.wallets ?? []))
      .catch(() => setLegacyWallets([]));
  }, []);

  const reloadUserWallets = useCallback((userId: string) => {
    return fetch(`/api/admin/user-wallets?user_id=${userId}`)
      .then((r) => (r.ok ? r.json() : { wallets: [] }))
      .then((d) => {
        setUserWallets(d.wallets ?? []);
        return d.wallets ?? [];
      })
      .catch(() => {
        setUserWallets([]);
        return [] as WalletRow[];
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.userId) {
      setUserWallets([]);
      return;
    }
    reloadUserWallets(form.userId);
  }, [form.userId, reloadUserWallets]);

  useEffect(() => {
    if (!form.fromWalletId || !form.toWalletId || !form.amount || Number(form.amount) <= 0) {
      setQuote(null);
      setQuoteError("");
      return;
    }
    const timer = setTimeout(() => {
      setQuoteError("");
      fetch("/api/admin/conversions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: form.userId,
          from_wallet_id: form.fromWalletId,
          to_wallet_id: form.toWalletId,
          amount: Number(form.amount),
          force: form.force,
        }),
      })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) {
            setQuote(null);
            setQuoteError((d as { error?: string }).error ?? "Quote failed");
            return;
          }
          setQuote(d.quote ?? null);
          setQuoteError("");
        })
        .catch(() => {
          setQuote(null);
          setQuoteError("Quote failed");
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [form.userId, form.fromWalletId, form.toWalletId, form.amount, form.force]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: form.userId,
          from_wallet_id: form.fromWalletId,
          to_wallet_id: form.toWalletId,
          amount: Number(form.amount),
          note: form.note || undefined,
          force: form.force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Conversion failed");
      setSuccess(
        `Converted ${data.quote.debitAmount} → ${data.quote.creditAmount} ${data.quote.toCurrency}`
      );
      setForm((f) => ({ ...f, amount: "", note: "" }));
      setQuote(null);
      load();
      if (form.userId) await reloadUserWallets(form.userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const createSplDestination = async () => {
    if (!form.userId) return;
    setCreatingWallet(true);
    setError("");
    setSuccess("");
    try {
      const currency = fromWallet?.currency === "USDC" ? "USDC" : "USDT";
      const res = await fetch("/api/admin/user-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: form.userId,
          currency,
          network: "SPL",
          label: `${currency} Solana (admin)`,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error ?? "Failed to create wallet");
      const wallets = await reloadUserWallets(form.userId);
      const destId = data.wallet?.id ?? data.walletId;
      const found =
        destId ||
        wallets.find((w: WalletRow) => w.currency === currency && w.network === "SPL")?.id;
      if (found) setForm((f) => ({ ...f, toWalletId: found }));
      setSuccess(`Solana ${currency} wallet ready for this merchant`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setCreatingWallet(false);
    }
  };

  const selectLegacyForConvert = async (w: LegacyTronWallet) => {
    setError("");
    setSuccess("");
    setForm({
      userId: w.userId,
      fromWalletId: w.id,
      toWalletId: "",
      amount: w.ledgerBalance > 0 ? String(w.ledgerBalance) : "",
      note: `TRC20 exit — ${w.userEmail}`,
      force: true,
    });
    const wallets = await reloadUserWallets(w.userId);
    const dest = wallets.find(
      (x: WalletRow) =>
        x.currency === w.currency &&
        isMerchantNetworkEnabled(x.currency, x.network) &&
        (x.isCustodial || x.walletType === "generated" || x.hasPrivateKey)
    );
    if (dest) {
      setForm((f) => ({ ...f, toWalletId: dest.id }));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSweep = async (walletId: string) => {
    const sweep = sweepForm[walletId];
    if (!sweep?.toAddress?.trim()) {
      setError("Enter a destination address for the sweep");
      return;
    }
    setSweepLoading(walletId);
    setError("");
    setSuccess("");
    try {
      const body: { wallet_id: string; to_address: string; amount?: number } = {
        wallet_id: walletId,
        to_address: sweep.toAddress.trim(),
      };
      if (sweep.amount && Number(sweep.amount) > 0) {
        body.amount = Number(sweep.amount);
      }
      const res = await fetch("/api/admin/treasury/tron-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sweep failed");
      setSuccess(data.message ?? "On-chain sweep submitted");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sweep failed");
    } finally {
      setSweepLoading(null);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Conversions & Treasury"
        subtitle="Move ledger balances between coins/networks · exit legacy Tron"
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

        <p className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>TRC20 exit:</strong> select the merchant → From = USDT (TRC20 — legacy) → To =
          Solana/Base/Polygon. Use <strong>Force ledger convert</strong> for Tron balances (moves
          books only). On-chain tokens stay on Tron until you withdraw or sweep below.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <h2 className="section-title mb-3">Admin Ledger Conversion</h2>
            <form onSubmit={handleConvert} className="space-y-3">
              <div>
                <label className="section-label mb-1 block">Merchant</label>
                <select
                  className="input w-full"
                  value={form.userId}
                  onChange={(e) =>
                    setForm({
                      userId: e.target.value,
                      fromWalletId: "",
                      toWalletId: "",
                      amount: "",
                      note: "",
                      force: true,
                    })
                  }
                  required
                >
                  <option value="">Select merchant…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.businessName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="section-label mb-1 block">From wallet</label>
                <select
                  className="input w-full"
                  value={form.fromWalletId}
                  onChange={(e) => setForm((f) => ({ ...f, fromWalletId: e.target.value }))}
                  required
                  disabled={!form.userId}
                >
                  <option value="">Select source…</option>
                  {sourceWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {getNetworkLabel(w.currency, w.network)} — {Number(w.balance).toFixed(4)}{" "}
                      {w.currency}
                      {isLegacyTronNetwork(w.network) ? " [LEGACY]" : ""}
                    </option>
                  ))}
                </select>
                {form.userId && sourceWallets.length === 0 && (
                  <p className="mt-1 text-2xs text-amber-400">
                    No custodial wallets found for this merchant.
                  </p>
                )}
              </div>

              <div>
                <label className="section-label mb-1 block">To wallet</label>
                <select
                  className="input w-full"
                  value={form.toWalletId}
                  onChange={(e) => setForm((f) => ({ ...f, toWalletId: e.target.value }))}
                  required
                  disabled={!form.userId}
                >
                  <option value="">Select destination…</option>
                  {destWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {getNetworkLabel(w.currency, w.network)} — {Number(w.balance).toFixed(4)}{" "}
                      {w.currency}
                    </option>
                  ))}
                </select>
                {form.userId && destWallets.length === 0 && (
                  <div className="mt-2">
                    <p className="mb-2 text-2xs text-amber-400">
                      No Solana/Base/Polygon destination yet. Create one:
                    </p>
                    <button
                      type="button"
                      onClick={createSplDestination}
                      disabled={creatingWallet}
                      className="btn-secondary px-3 py-2 text-2xs"
                    >
                      {creatingWallet ? "Creating…" : "Create Solana USDT wallet"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="section-label mb-1 block">Amount</label>
                <input
                  type="number"
                  step="any"
                  className="input w-full"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  disabled={!form.fromWalletId}
                />
                {fromWallet && Number(fromWallet.balance) > 0 && (
                  <button
                    type="button"
                    className="mt-1 text-2xs text-drift-purple hover:underline"
                    onClick={() =>
                      setForm((f) => ({ ...f, amount: String(Number(fromWallet.balance)) }))
                    }
                  >
                    Use full balance ({Number(fromWallet.balance).toFixed(4)})
                  </button>
                )}
              </div>

              <label className="flex items-start gap-2 text-xs text-drift-muted">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.force}
                  onChange={(e) => setForm((f) => ({ ...f, force: e.target.checked }))}
                />
                <span>
                  Force ledger convert (required for TRC20 exit while on-chain funds remain). Moves
                  Drift books only — does not bridge tokens.
                  {needsForce ? " Recommended for this source." : ""}
                </span>
              </label>

              {quoteError && (
                <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-xs text-drift-red">
                  {quoteError}
                  {!form.force && (
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => setForm((f) => ({ ...f, force: true }))}
                    >
                      Enable force
                    </button>
                  )}
                </p>
              )}

              {quote && (
                <p className="rounded border border-drift-border bg-drift-bg/50 px-3 py-2 text-xs text-drift-muted">
                  You receive{" "}
                  <span className="font-semibold text-white">{quote.creditAmount.toFixed(4)}</span>{" "}
                  at 1:1 (fee: {quote.feeAmount})
                </p>
              )}

              <div>
                <label className="section-label mb-1 block">Note (optional)</label>
                <input
                  className="input w-full"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. TRC20 exit for merchant"
                />
              </div>

              <button type="submit" disabled={loading || !quote} className="btn-primary w-full py-2">
                {loading ? "Converting…" : "Convert ledger balance"}
              </button>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="section-title mb-3">Recent Conversions</h2>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {transfers.length === 0 ? (
                <p className="text-sm text-drift-muted">No conversions yet</p>
              ) : (
                transfers.map((row) => (
                  <div
                    key={row.transfer.id}
                    className="rounded border border-drift-border p-3 text-xs"
                  >
                    <p className="font-medium text-white">{row.userEmail}</p>
                    <p className="mt-1 text-drift-muted">
                      {Number(row.transfer.debitAmount).toFixed(4)} {row.transfer.fromCurrency} (
                      {row.transfer.fromNetwork}) → {Number(row.transfer.creditAmount).toFixed(4)}{" "}
                      {row.transfer.toCurrency} ({row.transfer.toNetwork})
                    </p>
                    <p className="mt-1 text-drift-muted">
                      {row.transfer.createdBy} · {new Date(row.transfer.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="card mt-4 p-4">
          <h2 className="section-title mb-2">Legacy Tron (TRC20)</h2>
          <p className="mb-4 text-2xs text-drift-muted">
            <strong>Convert ledger</strong> moves the Drift balance to Solana/Base/Polygon.{" "}
            <strong>On-chain sweep</strong> sends actual Tron tokens to an external address (and
            debits ledger).
          </p>
          {legacyWallets.length === 0 ? (
            <p className="text-sm text-drift-muted">No legacy TRC20 wallets found</p>
          ) : (
            <div className="space-y-3">
              {legacyWallets.map((w) => {
                const sweep = sweepForm[w.id] ?? { toAddress: "", amount: "" };
                return (
                  <div
                    key={w.id}
                    className={cn(
                      "rounded border p-3",
                      w.ledgerBalance > 0 || w.onChainBalance > 0
                        ? "border-amber-500/30"
                        : "border-drift-border"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {w.userEmail} — {w.currency} TRC20
                        </p>
                        <p className="mt-1 break-all font-mono text-2xs text-drift-muted">
                          {w.address}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-2xs">
                          <span>
                            Ledger:{" "}
                            <span className="font-semibold text-white">
                              {w.ledgerBalance.toFixed(4)}
                            </span>
                          </span>
                          <span>
                            On-chain:{" "}
                            {w.onChainError ? (
                              <span className="text-drift-red">{w.onChainError}</span>
                            ) : (
                              <span className="font-semibold text-drift-green">
                                {w.onChainBalance.toFixed(4)}
                              </span>
                            )}
                          </span>
                          {w.nativeGas && (
                            <span className="text-drift-muted">
                              TRX: {w.nativeGas.amount?.toFixed(2) ?? "—"}
                            </span>
                          )}
                        </div>
                      </div>
                      {w.ledgerBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => selectLegacyForConvert(w)}
                          className="btn-primary px-3 py-2 text-2xs"
                        >
                          Convert ledger →
                        </button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        className="input min-w-[200px] flex-1 font-mono text-xs"
                        placeholder="Destination TRC20 address"
                        value={sweep.toAddress}
                        onChange={(e) =>
                          setSweepForm((prev) => ({
                            ...prev,
                            [w.id]: { ...sweep, toAddress: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="number"
                        step="any"
                        className="input w-28 text-xs"
                        placeholder="Max"
                        value={sweep.amount}
                        onChange={(e) =>
                          setSweepForm((prev) => ({
                            ...prev,
                            [w.id]: { ...sweep, amount: e.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleSweep(w.id)}
                        disabled={sweepLoading === w.id || w.onChainBalance <= 0}
                        className="btn-secondary px-3 py-2 text-2xs disabled:opacity-40"
                      >
                        {sweepLoading === w.id ? "Sweeping…" : "On-chain sweep"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
