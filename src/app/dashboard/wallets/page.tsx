"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";
import { wallets, walletQuickActions, recentActivity } from "@/lib/mock-data";

const RANGES = ["7D", "30D", "90D", "1Y"];

const networkBadge: Record<string, string> = {
  TRC20: "bg-[#7c3aed29] text-[#c4b5fd]",
  Bitcoin: "bg-[#f59e0b29] text-[#fbbf24]",
  ERC20: "bg-[#3b82f629] text-[#93c5fd]",
  BEP20: "bg-[#eab30829] text-[#fde047]",
};

const tileClass: Record<string, string> = {
  purple: "tile-purple",
  blue: "tile-blue",
  green: "tile-green",
  orange: "tile-orange",
};

export default function WalletsPage() {
  const [range, setRange] = useState("30D");

  return (
    <>
      <DashboardHeader
        title="Wallets"
        subtitle="Manage all your wallets and view balances."
        actions={
          <>
            <button className="flex items-center gap-1.5 rounded-lg bg-[#7c3aed] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#6d28d9]">
              <Icon name="Plus" className="h-4 w-4" />
              <span className="hidden sm:inline">Create Wallet</span>
            </button>
            <button className="hidden h-9 w-9 items-center justify-center rounded-lg border border-drift-border bg-drift-card text-drift-muted hover:text-white sm:flex">
              <Icon name="Sun" className="h-[18px] w-[18px]" />
            </button>
          </>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Total balance */}
            <div className="card-elevated p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-drift-muted">Total Balance</p>
                  <Icon name="Eye" className="h-3.5 w-3.5 text-drift-muted" />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-drift-border bg-drift-card p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-medium",
                        range === r ? "bg-[#7c3aed] text-white" : "text-drift-muted hover:text-white"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-white">$24,560.00</span>
                <span className="text-[13px] font-medium text-drift-green">+12.5% vs last month</span>
              </div>
              <div className="mt-3">
                <WalletBalanceChart />
              </div>
            </div>

            {/* Wallets table */}
            <div>
              <h2 className="mb-3 text-[16px] font-semibold text-white">Your Wallets</h2>
              <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-drift-border text-[12px] text-drift-muted">
                        <th className="px-5 py-3 font-medium">Wallet</th>
                        <th className="px-5 py-3 font-medium">Balance</th>
                        <th className="px-5 py-3 font-medium">Network</th>
                        <th className="px-5 py-3 font-medium">Address</th>
                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wallets.map((w) => (
                        <tr key={w.id} className="border-b border-drift-border/60 last:border-0">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <CryptoIcon symbol={w.symbol} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-medium text-white">{w.name}</span>
                                  {w.isPrimary && (
                                    <span className="rounded bg-[#7c3aed29] px-1.5 py-0.5 text-[10px] font-medium text-[#c4b5fd]">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-drift-muted">{w.subtitle}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[13px] font-medium tabular-nums text-white">{w.balanceDisplay}</p>
                            <p className="text-[11px] tabular-nums text-drift-muted">
                              ${w.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-medium",
                                networkBadge[w.network] ?? "bg-white/10 text-drift-muted"
                              )}
                            >
                              {w.network}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] text-drift-muted">{w.addressDisplay}</span>
                              <button className="text-drift-muted hover:text-white">
                                <Icon name="Copy" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button className="rounded-lg border border-drift-border bg-drift-card px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/5">
                                Deposit
                              </button>
                              <button className="rounded-lg border border-drift-border bg-drift-card px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/5">
                                Withdraw
                              </button>
                              <button className="text-drift-muted hover:text-white">
                                <Icon name="MoreVertical" className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="flex w-full items-center justify-center gap-2 border-t border-dashed border-drift-border py-4 text-[13px] text-drift-muted hover:text-white">
                  <Icon name="Plus" className="h-4 w-4" />
                  <span className="font-medium text-white">Create New Wallet</span>
                  <span>— Add a new wallet to start receiving payments</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <div className="card-elevated p-5">
              <h3 className="mb-3 text-[15px] font-semibold text-white">Quick Actions</h3>
              <div className="space-y-2">
                {walletQuickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-xl border border-drift-border bg-drift-card p-3 transition-colors hover:bg-white/5"
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tileClass[action.color])}>
                      <Icon name={action.icon as IconName} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-white">{action.label}</span>
                      <span className="block text-[11px] text-drift-muted">{action.description}</span>
                    </span>
                    <Icon name="ChevronRight" className="h-4 w-4 text-drift-muted" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="card-elevated p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-white">Recent Activity</h3>
                <Link href="/dashboard/transactions" className="text-[12px] text-[#a78bfa] hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-4">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        a.positive ? "bg-[#22c55e1f] text-[#4ade80]" : "bg-[#ef44441f] text-[#f87171]"
                      )}
                    >
                      <Icon name={a.positive ? "ArrowDownLeft" : "ArrowUpRight"} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white">{a.title}</p>
                      <p className="truncate text-[11px] text-drift-muted">{a.party}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[13px] font-medium tabular-nums", a.positive ? "text-drift-green" : "text-drift-red")}>
                        {a.amount}
                      </p>
                      <p className="text-[11px] text-drift-muted">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-elevated p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl tile-purple">
                  <Icon name="ShieldCheck" className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">Your funds are secure</p>
                  <p className="mt-1 text-[12px] text-drift-muted">
                    We use industry-leading security to protect your assets.
                  </p>
                  <Link href="/developers" className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#a78bfa] hover:underline">
                    Learn more
                    <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
