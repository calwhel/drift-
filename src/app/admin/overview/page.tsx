"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  completedTransactions: number;
  platformRevenue: number;
  totalGrossVolume: number;
  recentTransactions: Array<{
    id: string;
    amount: string;
    currency: string;
    network: string;
    status: string;
    feeAmount: string | null;
    createdAt: string;
    userId: string;
    customerEmail?: string | null;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    businessName: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

export default function AdminOverviewPage() {
  const { setOpen } = useAdminSidebar();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load stats");
        }
        return r.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Platform Revenue", value: `$${(stats?.platformRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: "Gross Volume", value: `$${(stats?.totalGrossVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: "Transactions", value: stats?.totalTransactions ?? 0 },
    { label: "Completed", value: stats?.completedTransactions ?? 0 },
  ];

  return (
    <>
      <DashboardHeader
        title="Admin Overview"
        subtitle="Platform-wide metrics"
        onMenuClick={() => setOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}

        <div className="card flex divide-x divide-drift-border overflow-x-auto">
          {cards.map((card) => (
            <div key={card.label} className="min-w-[140px] flex-1 px-4 py-3">
              <span className="section-label">{card.label}</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Recent Transactions</h2>
              <Link href="/admin/transactions" className="text-2xs text-drift-purple hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {(stats?.recentTransactions ?? []).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded border border-drift-border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">
                      {Number(tx.amount).toFixed(4)} {tx.currency}
                    </p>
                    <p className="text-drift-muted">{tx.network} · {tx.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-drift-green">+${Number(tx.feeAmount ?? 0).toFixed(4)} fee</p>
                    <p className="text-drift-muted">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!stats?.recentTransactions?.length && (
                <p className="text-sm text-drift-muted">No transactions yet</p>
              )}
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Recent Users</h2>
              <Link href="/admin/users" className="text-2xs text-drift-purple hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {(stats?.recentUsers ?? []).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded border border-drift-border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">{user.businessName}</p>
                    <p className="text-drift-muted">{user.email}</p>
                  </div>
                  <div className="text-right">
                    {user.isAdmin && (
                      <span className="rounded bg-drift-purple/20 px-1.5 py-0.5 text-2xs text-drift-purple">
                        Admin
                      </span>
                    )}
                    <p className="mt-1 text-drift-muted">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!stats?.recentUsers?.length && (
                <p className="text-sm text-drift-muted">No users yet</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
