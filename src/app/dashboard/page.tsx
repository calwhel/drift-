"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { StatsRow } from "@/components/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { PaymentMethodsChart } from "@/components/dashboard/payment-methods-chart";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";

export default function DashboardOverviewPage() {
  const { setOpen } = useSidebar();

  return (
    <>
      <DashboardHeader
        title="Overview"
        subtitle="May 1 – May 31, 2024"
        onMenuClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-1.5">
            <Icon name="Download" className="h-3 w-3" />
            Export
          </button>
        </div>
      </DashboardHeader>

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <StatsRow />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="section-title">Revenue</h2>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-white">
                  $24,560.00
                  <span className="ml-2 text-2xs font-normal text-drift-green">+12.5%</span>
                </p>
              </div>
              <select className="input py-1 text-2xs">
                <option>Gross revenue</option>
              </select>
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
            <TransactionsTable limit={5} showViewAll />
          </div>

          <div className="space-y-4">
            <div className="card p-4">
              <p className="section-label">Total balance</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white">$24,560.00</p>
              <p className="mt-0.5 text-2xs text-drift-green">+12.5% vs last month</p>
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
                  { label: "Create invoice", href: "/dashboard/invoices" },
                  { label: "Manage wallets", href: "/dashboard/wallets" },
                  { label: "Add customer", href: "/dashboard/customers" },
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
