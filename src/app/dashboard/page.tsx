"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { StatsCard } from "@/components/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";
import { statsCards } from "@/lib/mock-data";

export default function DashboardOverviewPage() {
  const { setOpen } = useSidebar();

  return (
    <>
      <DashboardHeader
        title="Overview 👋"
        subtitle="Here's what's happening with your business today."
        onMenuClick={() => setOpen(true)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-drift-muted">
            May 1 – May 31, 2024
            <Icon name="ChevronDown" className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-white hover:bg-drift-card-hover">
            <Icon name="Download" className="h-4 w-4" />
            Export
          </button>
        </div>
      </DashboardHeader>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statsCards.map((card) => (
            <StatsCard key={card.label} {...card} icon={card.icon as "DollarSign"} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-drift-border bg-drift-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Revenue Overview</h2>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">$24,560.00</p>
                  <span className="text-xs text-drift-green">↗ 12.5%</span>
                </div>
              </div>
              <button className="flex items-center gap-1 rounded-lg border border-drift-border px-3 py-1.5 text-xs text-drift-muted">
                Gross Revenue
                <Icon name="ChevronDown" className="h-3 w-3" />
              </button>
            </div>
            <RevenueChart />
          </div>

          <div className="rounded-xl border border-drift-border bg-drift-card p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Payment Methods</h2>
            <PaymentMethodsChart />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-drift-border bg-drift-card p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-white">Recent Transactions</h2>
            <TransactionsTable limit={5} />
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-drift-border bg-drift-card p-5">
              <p className="text-sm text-drift-muted">Total Balance</p>
              <p className="mt-1 text-3xl font-bold text-white">$24,560.00</p>
              <p className="mt-1 text-sm text-drift-green">↗ 12.5% vs last month</p>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-lg bg-drift-purple py-2.5 text-sm font-medium text-white hover:bg-drift-purple/90">
                  Withdraw
                </button>
                <Link
                  href="/dashboard/wallets"
                  className="flex-1 rounded-lg border border-drift-border py-2.5 text-center text-sm font-medium text-white hover:bg-drift-card-hover"
                >
                  View Wallets
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-drift-border bg-drift-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Create Payment Link", icon: "Link", color: "text-drift-purple" },
                  { label: "Create Invoice", icon: "FileText", color: "text-blue-400" },
                  { label: "Manage Wallets", icon: "Wallet", color: "text-drift-green" },
                  { label: "Add Customer", icon: "Users", color: "text-drift-orange" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex flex-col items-center gap-2 rounded-lg border border-drift-border p-3 text-center text-xs text-drift-muted transition-colors hover:bg-drift-card-hover hover:text-white"
                  >
                    <Icon name={action.icon as "Link"} className={`h-5 w-5 ${action.color}`} />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
