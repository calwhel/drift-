"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { LiveStatsRow } from "@/components/dashboard/live-stats-row";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";
import type { Transaction } from "@/lib/mock-data";

interface DashboardStats {
  totalGross: number;
  totalPayments: number;
  completed: number;
  pending: number;
  recentTransactions: Array<{
    id: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
    customerEmail?: string | null;
  }>;
}

function mapTx(tx: DashboardStats["recentTransactions"][0]): Transaction {
  const statusMap: Record<string, Transaction["status"]> = {
    completed: "Completed",
    confirming: "Pending",
    pending: "Pending",
    failed: "Failed",
  };
  return {
    id: tx.id.slice(0, 12).toUpperCase(),
    customer: tx.customerEmail ?? "Customer",
    amount: Number(tx.amount),
    currency: tx.currency,
    status: statusMap[tx.status] ?? "Pending",
    date: new Date(tx.createdAt).toLocaleString(),
  };
}

export default function DashboardOverviewPage() {
  const { setOpen } = useSidebar();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => setBalance(d.totalBalance ?? 0))
      .catch(console.error);
  }, []);

  const transactions = stats?.recentTransactions.map(mapTx) ?? [];

  return (
    <>
      <DashboardHeader title="Overview" subtitle="Your business at a glance" onMenuClick={() => setOpen(true)}>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5">
            <Icon name="Download" className="h-3 w-3" />
            Export
          </button>
        </div>
      </DashboardHeader>

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <LiveStatsRow stats={stats} />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="section-title">Revenue</h2>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-white">
                  ${(stats?.totalGross ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <RevenueChart />
          </div>
          <div className="card p-4">
            <h2 className="section-title">Payment methods</h2>
            <PaymentMethodsChart />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h2 className="section-title mb-3">Recent transactions</h2>
            <TransactionsTable data={transactions} limit={5} showViewAll />
          </div>
          <div className="space-y-4">
            <div className="card p-4">
              <p className="section-label">Total balance</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary flex-1">Withdraw</button>
                <Link href="/dashboard/wallets" className="btn-secondary flex-1 text-center">
                  Wallets
                </Link>
              </div>
            </div>
            <div className="card p-4">
              <h3 className="section-label mb-2">Quick actions</h3>
              <div className="space-y-px">
                {[
                  { label: "Create payment link", href: "/dashboard/payment-links" },
                  { label: "API keys", href: "/dashboard/api-keys" },
                  { label: "Manage wallets", href: "/dashboard/wallets" },
                  { label: "Webhooks", href: "/dashboard/webhooks" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 text-xs text-drift-muted hover:bg-drift-hover hover:text-white"
                  >
                    {action.label}
                    <Icon name="ChevronRight" className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
