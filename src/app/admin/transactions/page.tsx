"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
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

        <div className="card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-drift-border text-drift-muted">
                <th className="px-4 py-3 font-medium">Merchant</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Fee (1.5%)</th>
                <th className="px-4 py-3 font-medium">Network</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
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
                            : "text-drift-muted"
                      }
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-drift-muted">
                    {new Date(tx.createdAt).toLocaleString()}
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
