"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";

interface TxRow {
  id: string;
  amount: string;
  currency: string;
  network: string;
  status: string;
  feeAmount: string | null;
  netAmount: string | null;
  txHash: string | null;
  customerEmail: string | null;
  createdAt: string;
  userEmail: string | null;
  businessName: string | null;
}

export default function AdminTransactionsPage() {
  const { setOpen } = useAdminSidebar();
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/transactions?limit=50")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load transactions");
        }
        return r.json();
      })
      .then((d) => {
        setTransactions(d.data ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (id: string, action: "cancel" | "complete") => {
    setActionId(id);
    setError("");
    const res = await fetch(`/api/admin/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActionId(null);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }
    load();
  };

  return (
    <>
      <DashboardHeader
        title="Transactions"
        subtitle={`${total} total across all merchants`}
        onMenuClick={() => setOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}

        <p className="mb-4 text-xs text-drift-muted">
          Funds are never deleted from the blockchain — they sit at the deposit address until credited to the merchant
          ledger on completion. Cancel false underpaid rows; complete verified payments that were stuck.
        </p>

        <div className="card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-drift-border text-drift-muted">
                <th className="px-4 py-3 font-medium">Merchant</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Fee (1.5%)</th>
                <th className="px-4 py-3 font-medium">Network</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tx hash</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{tx.businessName ?? "—"}</p>
                    <p className="text-drift-muted">{tx.userEmail ?? tx.customerEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {Number(tx.amount).toFixed(4)} {tx.currency}
                  </td>
                  <td className="px-4 py-3 text-drift-green">
                    ${Number(tx.feeAmount ?? 0).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-drift-muted">{tx.network}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        tx.status === "completed"
                          ? "text-drift-green"
                          : tx.status === "failed"
                            ? "text-drift-red"
                            : tx.status === "underpaid"
                              ? "text-amber-400"
                              : "text-drift-muted"
                      }
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[10px] text-drift-muted">
                    {tx.txHash ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-drift-muted">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {(tx.status === "underpaid" ||
                      tx.status === "overpaid" ||
                      tx.status === "confirming") && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionId === tx.id}
                          onClick={() => runAction(tx.id, "cancel")}
                          className="rounded border border-drift-border px-2 py-1 text-[10px] text-drift-muted hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actionId === tx.id}
                          onClick={() => runAction(tx.id, "complete")}
                          className="rounded border border-drift-green/40 px-2 py-1 text-[10px] text-drift-green hover:bg-drift-green/10"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!transactions.length && !error && (
            <p className="p-4 text-sm text-drift-muted">No transactions yet</p>
          )}
        </div>
      </main>
    </>
  );
}
