"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatusBadge } from "@/components/status-badge";

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
  walletType: string;
  balance: string;
}

export default function PayoutsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/withdrawals")
      .then((r) => r.json())
      .then(setWithdrawals)
      .catch(() => {});

    fetch("/api/wallets")
      .then((r) => r.json())
      .then((data) => {
        const generatedWallets = (data.wallets ?? []).filter(
          (w: WalletOption) => w.walletType === "generated"
        );
        setWallets(generatedWallets);
        setWalletId((current) => current || generatedWallets[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async () => {
    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet_id: walletId,
        amount: Number(amount),
        to_address: toAddress,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setAmount("");
      setToAddress("");
      load();
    }
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-1">
            <h2 className="section-title mb-3">New withdrawal</h2>
            <div className="space-y-3">
              <div>
                <label className="section-label mb-1 block">Amount</label>
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="section-label mb-1 block">Wallet</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="input w-full"
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.currency} ({wallet.network}) - Balance: {wallet.balance}
                    </option>
                  ))}
                </select>
                {wallets.length === 0 && (
                  <p className="mt-1 text-2xs text-drift-muted">
                    Create a generated wallet first to enable withdrawals.
                  </p>
                )}
              </div>
              <div>
                <label className="section-label mb-1 block">Destination address</label>
                <input type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="input w-full font-mono text-xs" />
              </div>
              <button onClick={handleWithdraw} disabled={loading || !amount || !toAddress || !walletId} className="btn-primary w-full py-2">
                {loading ? "Processing…" : "Withdraw"}
              </button>
            </div>
          </div>
          <div className="card overflow-hidden lg:col-span-2">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-drift-border text-drift-muted">
                <tr>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Address</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-drift-border/50">
                    <td className="px-4 py-2.5 tabular-nums text-white">{w.amount} {w.currency}</td>
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
                    <td colSpan={4} className="px-4 py-8 text-center text-drift-muted">No withdrawals yet</td>
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
