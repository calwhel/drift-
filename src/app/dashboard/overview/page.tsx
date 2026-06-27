"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsRow } from "@/components/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";
import type { LiveStats } from "@/components/stats-card";
import type { Transaction } from "@/lib/mock-data";

interface DashboardStats {
  totalGross: number;
  totalPayments: number;
  completed: number;
  pending: number;
  revenueChart?: Array<{ date: string; revenue: string | number }>;
  paymentMethods?: Record<string, number>;
  recentTransactions: Array<{
    id: string;
    amount: string;
    currency: string;
    status: string;
    createdAt: string;
    customerEmail?: string | null;
  }>;
}

interface WalletRow {
  id: string;
  currency: string;
  balance: string;
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

export default function OverviewPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/dashboard/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/wallets").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([statsData, walletsData]) => {
        if (statsData) setStats(statsData);
        if (walletsData) {
          setWallets(walletsData.wallets ?? []);
          setTotalBalance(walletsData.totalBalance ?? 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, router]);

  const liveStats: LiveStats | null = stats
    ? {
        totalGross: stats.totalGross,
        totalPayments: stats.totalPayments,
        completed: stats.completed,
        pending: stats.pending,
      }
    : null;

  const recentTx = stats?.recentTransactions?.length
    ? stats.recentTransactions.map(mapTx)
    : undefined;

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Overview" />

      <div className="space-y-6 p-4 sm:p-6">
        <StatsRow live={liveStats} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Revenue</h2>
            </div>
            <RevenueChart data={stats?.revenueChart} />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-4 text-base font-semibold text-white">Payment Methods</h2>
            <PaymentMethodsChart data={stats?.paymentMethods} total={stats?.totalGross} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
              <button
                onClick={() => router.push("/dashboard/transactions")}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                View all
              </button>
            </div>
            <TransactionsTable data={recentTx} limit={5} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-white">Balance</h2>
              <p className="text-3xl font-bold text-white">
                ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-gray-500">Available to withdraw</p>
              <div className="mt-6 space-y-3">
                {wallets.length > 0 ? (
                  wallets.slice(0, 3).map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{w.currency}</span>
                      <span className="font-medium text-white">
                        {parseFloat(w.balance).toFixed(4)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No wallets yet</p>
                )}
              </div>
              <button
                onClick={() => router.push("/dashboard/wallets")}
                className="mt-6 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500"
              >
                Manage Wallets
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h3 className="mb-3 text-sm font-semibold text-white">Quick Actions</h3>
              <div className="space-y-1">
                {[
                  { label: "Create payment link", href: "/dashboard/payment-links" },
                  { label: "API keys", href: "/dashboard/api-keys" },
                  { label: "Manage wallets", href: "/dashboard/wallets" },
                  { label: "Webhooks", href: "/dashboard/webhooks" },
                ].map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
                  >
                    {action.label}
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
