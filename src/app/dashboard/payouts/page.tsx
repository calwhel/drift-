"use client";

import { useState, useEffect } from "react";
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

export default function PayoutsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [toAddress, setToAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/withdrawals")
      .then((r) => r.json())
      .then(setWithdrawals)
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    setLoading(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        currency,
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
                <label className="section-label mb-1 block">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-full">
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <div>
                <label className="section-label mb-1 block">Destination address</label>
                <input type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="input w-full font-mono text-xs" />
              </div>
              <button onClick={handleWithdraw} disabled={loading || !amount || !toAddress} className="btn-primary w-full py-2">
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
