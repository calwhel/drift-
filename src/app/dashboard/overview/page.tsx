"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { StatsRow } from "@/components/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon, type IconName } from "@/components/icons";
import { overviewQuickActions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const tileClass: Record<string, string> = {
  purple: "tile-purple",
  blue: "tile-blue",
  green: "tile-green",
  orange: "tile-orange",
};

export default function DashboardOverviewPage() {
  return (
    <>
      <DashboardHeader
        title="Overview"
        emoji="👋"
        subtitle="Here's what's happening with your business today."
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-[12px] text-white">
              <Icon name="Calendar" className="h-3.5 w-3.5 text-drift-muted" />
              May 1 – May 31, 2024
              <Icon name="ChevronDown" className="h-3.5 w-3.5 text-drift-muted" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-[12px] text-white">
              <Icon name="Download" className="h-3.5 w-3.5 text-drift-muted" />
              Export
              <Icon name="ChevronDown" className="h-3.5 w-3.5 text-drift-muted" />
            </button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <StatsRow />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card-elevated p-5 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Icon name="TrendingUp" className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-[15px] font-semibold text-white">Revenue Overview</h2>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-drift-border bg-drift-card px-2.5 py-1.5 text-[12px] text-white">
                Gross Revenue
                <Icon name="ChevronDown" className="h-3.5 w-3.5 text-drift-muted" />
              </button>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl font-bold tabular-nums text-white">$24,560.00</span>
              <span className="flex items-center gap-0.5 text-[13px] font-medium text-drift-green">
                <Icon name="ArrowUpRight" className="h-3.5 w-3.5" />
                12.5%
              </span>
            </div>
            <p className="mb-2 text-[12px] text-drift-muted">vs Apr 1 – Apr 30</p>
            <RevenueChart />
          </div>

          <div className="card-elevated p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="DollarSign" className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-[15px] font-semibold text-white">Payment Methods</h2>
              </div>
              <Link href="/dashboard/transactions" className="text-[12px] text-[#a78bfa] hover:underline">
                View all
              </Link>
            </div>
            <PaymentMethodsChart />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card-elevated p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="ArrowRightLeft" className="h-4 w-4 text-[#a78bfa]" />
                <h2 className="text-[15px] font-semibold text-white">Recent Transactions</h2>
              </div>
              <Link href="/dashboard/transactions" className="text-[12px] text-[#a78bfa] hover:underline">
                View all
              </Link>
            </div>
            <TransactionsTable limit={4} />
          </div>

          <div className="space-y-4">
            <div className="card-elevated relative overflow-hidden p-5">
              <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] shadow-[0_8px_24px_rgba(124,58,237,0.4)]">
                <Icon name="Wallet" className="h-6 w-6 text-white" />
              </div>
              <p className="text-[13px] text-drift-muted">Total Balance</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums text-white">$24,560.00</span>
                <span className="text-[13px] font-medium text-drift-green">12.5%</span>
              </div>
              <p className="mt-1 text-[12px] text-drift-muted">Available to withdraw</p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/dashboard/payouts"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#7c3aed] py-2.5 text-[13px] font-semibold text-white hover:bg-[#6d28d9]"
                >
                  <Icon name="ArrowUpRight" className="h-4 w-4" />
                  Withdraw
                </Link>
                <Link
                  href="/dashboard/wallets"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-drift-border bg-drift-card py-2.5 text-[13px] font-medium text-white hover:bg-white/5"
                >
                  <Icon name="Wallet" className="h-4 w-4" />
                  View Wallets
                </Link>
              </div>
            </div>

            <div className="card-elevated p-5">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="Zap" className="h-4 w-4 text-[#a78bfa]" />
                <h3 className="text-[15px] font-semibold text-white">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {overviewQuickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col gap-2 rounded-xl border border-drift-border bg-drift-card p-3 transition-colors hover:bg-white/5"
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tileClass[action.color])}>
                      <Icon name={action.icon as IconName} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-[12px] font-medium leading-tight text-white">{action.label}</span>
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
