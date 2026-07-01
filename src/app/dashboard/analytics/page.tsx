"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { StatsRow } from "@/components/stats-card";
import type { LiveStats } from "@/components/stats-card";

interface DashboardStats {
  totalGross: number;
  totalFees: number;
  totalPayments: number;
  completed: number;
  pending: number;
  revenueChart?: Array<{ date: string; revenue: string | number }>;
  paymentMethods?: Record<string, number>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/customers").then((r) => (r.ok ? r.json() : { total: 0 })),
    ])
      .then(([statsData, customersData]) => {
        if (statsData) setStats(statsData);
        setCustomerCount(customersData?.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const live: LiveStats | null = stats
    ? {
        totalGross: stats.totalGross,
        totalPayments: stats.totalPayments,
        completed: stats.completed,
        pending: stats.pending,
      }
    : null;

  return (
    <>
      <DashboardHeader title="Analytics" subtitle="Payment performance across your account" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <p className="text-sm text-drift-muted">Loading analytics…</p>
        ) : (
          <div className="space-y-6">
            <StatsRow live={live} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="card p-4">
                <p className="text-2xs text-drift-muted">Platform fees paid</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  ${(stats?.totalFees ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-2xs text-drift-muted">Unique customers</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{customerCount}</p>
              </div>
              <div className="card p-4">
                <p className="text-2xs text-drift-muted">Completion rate</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {stats && stats.totalPayments > 0
                    ? `${Math.round((stats.completed / stats.totalPayments) * 100)}%`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="card-elevated p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Revenue (30 days)</h2>
                <RevenueChart data={stats?.revenueChart} />
              </div>
              <div className="card-elevated p-4">
                <h2 className="mb-3 text-sm font-semibold text-white">Volume by currency</h2>
                <PaymentMethodsChart data={stats?.paymentMethods} total={stats?.totalGross} />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
