"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon } from "@/components/icons";
import { recentActivity, wallets } from "@/lib/mock-data";

const TIMEFRAMES = ["7D", "30D", "90D", "1Y"];

export default function WalletsPage() {
  const [timeframe, setTimeframe] = useState("30D");

  return (
    <>
      <DashboardHeader
        title="Wallets"
        subtitle="Manage all your wallets and view balances."
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-drift-purple px-4 py-2 text-sm font-medium text-white hover:bg-drift-purple/90">
            <Icon name="Plus" className="h-4 w-4" />
            <span className="hidden sm:inline">Create Wallet</span>
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="rounded-xl border border-drift-border bg-drift-card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-drift-muted">Total Balance</p>
                  <Icon name="Eye" className="h-4 w-4 text-drift-muted" />
                </div>
                <p className="mt-1 text-3xl font-bold text-white">$24,560.00</p>
                <p className="mt-1 text-sm text-drift-green">+12.5% vs last month</p>
              </div>
              <div className="flex gap-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      timeframe === tf
                        ? "bg-drift-purple text-white"
                        : "border border-drift-border text-drift-muted hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <WalletBalanceChart />
          </div>

          <div className="mt-6 rounded-xl border border-drift-border bg-drift-card p-5">
            <h2 className="mb-4 text-base font-semibold text-white">Your Wallets</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-drift-border text-left text-xs text-drift-muted">
                    <th className="pb-3 pr-4 font-medium">Wallet</th>
                    <th className="pb-3 pr-4 font-medium">Balance</th>
                    <th className="pb-3 pr-4 font-medium">Network</th>
                    <th className="pb-3 pr-4 font-medium">Address</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className="border-b border-drift-border/50 text-sm">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={wallet.symbol} size="md" />
                          <div>
                            <p className="font-medium text-white">{wallet.name}</p>
                            {wallet.isPrimary && (
                              <span className="mt-0.5 inline-block rounded-full bg-drift-purple/10 px-2 py-0.5 text-[10px] font-medium text-drift-purple">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-white">{wallet.balance} {wallet.symbol}</p>
                        <p className="text-xs text-drift-muted">${wallet.usdValue.toLocaleString()}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full border border-drift-border px-2.5 py-0.5 text-xs text-drift-muted">
                          {wallet.network}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-drift-muted">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                          </span>
                          <button className="text-drift-muted hover:text-white">
                            <Icon name="Copy" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button className="rounded-lg border border-drift-border px-3 py-1.5 text-xs text-white hover:bg-drift-card-hover">
                            Deposit
                          </button>
                          <button className="rounded-lg border border-drift-border px-3 py-1.5 text-xs text-white hover:bg-drift-card-hover">
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

            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-drift-border py-6 text-sm text-drift-muted transition-colors hover:border-drift-purple hover:text-drift-purple">
              <Icon name="Plus" className="h-5 w-5" />
              Create New Wallet
            </button>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-drift-border bg-drift-bg p-6 xl:block">
          <h3 className="mb-3 text-sm font-semibold text-white">Quick Actions</h3>
          <div className="space-y-1">
            {[
              { label: "Deposit Crypto", sub: "Add funds", icon: "ArrowDownRight" },
              { label: "Withdraw Funds", sub: "Transfer to external", icon: "ArrowUpRight" },
              { label: "Transfer Between Wallets", sub: "Move funds instantly", icon: "ArrowRightLeft" },
              { label: "View Address", sub: "View all wallet addresses", icon: "Wallet" },
            ].map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-drift-card"
              >
                <Icon name={action.icon as "Wallet"} className="h-4 w-4 text-drift-purple" />
                <div className="flex-1">
                  <p className="text-sm text-white">{action.label}</p>
                  <p className="text-xs text-drift-muted">{action.sub}</p>
                </div>
                <Icon name="ChevronRight" className="h-4 w-4 text-drift-muted" />
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <button className="text-xs text-drift-purple">View all</button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      item.type === "received" ? "bg-drift-green/10" : "bg-drift-red/10"
                    }`}
                  >
                    <Icon
                      name={item.type === "received" ? "ArrowDownRight" : "ArrowUpRight"}
                      className={`h-4 w-4 ${item.type === "received" ? "text-drift-green" : "text-drift-red"}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="truncate text-xs text-drift-muted">{item.from}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className={`text-xs font-medium ${item.type === "received" ? "text-drift-green" : "text-drift-red"}`}>
                        {item.amount}
                      </span>
                      <span className="text-xs text-drift-muted">{item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-drift-border bg-drift-card p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-drift-purple/10">
              <Icon name="Shield" className="h-4 w-4 text-drift-purple" />
            </div>
            <p className="mt-2 text-sm font-medium text-white">Your funds are secure</p>
            <p className="mt-1 text-xs text-drift-muted">
              We use industry-leading security to protect your assets.
            </p>
            <button className="mt-2 text-xs font-medium text-drift-purple hover:underline">
              Learn more →
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
