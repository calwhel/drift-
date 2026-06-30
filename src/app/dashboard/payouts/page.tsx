"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/status-badge";
import { getNetworkLabel } from "@/lib/constants";

interface Withdrawal {
  id: string;
  amount: string;
  currency: string;
  network: string;
  toAddress: string;
  status: string;
  createdAt: string;
}

interface WalletOption {
  id: string;
  currency: string;
  network: string;
  balance: string;
  walletType: string;
  label: string | null;
}

export default function PayoutsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const custodialWallets = wallets.filter((w) => w.walletType === "generated");
  const selectedWallet = custodialWallets.find((w) => w.id === walletId);

  const load = () => {
    fetch("/api/withdrawals")
      .then((r) => (r.ok ? r.json() : []))
      .then(setWithdrawals)
      .catch(() => {});
  };

  useEffect(() => {
    load();
    fetch("/api/wallets")
      .then((r) => (r.ok ? r.json() : { wallets: [] }))
      .then((d) => {
        const rows = (d.wallets ?? []).filter((w: WalletOption) => w.walletType === "generated");
        setWallets(rows);
        if (rows.length > 0) setWalletId(rows[0].id);
      })
      .catch(() => {});
  }, []);

  const handleWithdraw = async () => {
    if (!walletId) {
      setError("Create a Drift custodial wallet in Wallets first");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_id: walletId,
        amount: Number(amount),
        to_address: toAddress.trim(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Withdrawal failed");
      return;
    }
    setAmount("");
    setToAddress("");
    load();
  };

  const statusMap: Record<string, "Completed" | "Pending" | "Failed"> = {
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
  };

  return (
    <>
      <DashboardHeader title="Payouts" subtitle="Withdraw funds to your wallet" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-1">
            <h2 className="section-title mb-3">New withdrawal</h2>
            {custodialWallets.length === 0 ? (
              <p className="text-sm text-drift-muted">
                Withdrawals require a Drift-generated custodial wallet.{" "}
                <Link href="/dashboard/wallets" className="text-brand-400 hover:underline">
                  Add one in Wallets
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="section-label mb-1 block">From wallet</label>
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="input w-full"
                  >
                    {custodialWallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label ?? getNetworkLabel(w.currency, w.network)} — {Number(w.balance).toFixed(4)}{" "}
                        {w.currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="section-label mb-1 block">Amount</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input w-full"
                    placeholder={selectedWallet ? `Max ${Number(selectedWallet.balance).toFixed(4)}` : "0.00"}
                  />
                </div>
                <div>
                  <label className="section-label mb-1 block">Destination address</label>
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="input w-full font-mono text-xs"
                  />
                  {selectedWallet && (
                    <p className="mt-1 text-2xs text-drift-muted">
                      Network: {getNetworkLabel(selectedWallet.currency, selectedWallet.network)}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !amount || !toAddress || !walletId}
                  className="btn-primary w-full py-2"
                >
                  {loading ? "Processing…" : "Withdraw"}
                </button>
              </div>
            )}
          </div>
          <div className="card overflow-hidden lg:col-span-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-drift-border text-drift-muted">
                <tr>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Network</th>
                  <th className="px-4 py-2">Address</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-drift-border/50">
                    <td className="px-4 py-2.5 tabular-nums text-white">
                      {w.amount} {w.currency}
                    </td>
                    <td className="px-4 py-2.5 text-drift-muted">
                      {getNetworkLabel(w.currency, w.network)}
                    </td>
                    <td className="max-w-[120px] truncate px-4 py-2.5 font-mono text-2xs">{w.toAddress}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={statusMap[w.status] ?? "Pending"} />
                    </td>
                    <td className="px-4 py-2.5 text-drift-muted">
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-drift-muted">
                      No withdrawals yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
