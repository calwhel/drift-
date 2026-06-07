"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";
import { recentActivity, wallets } from "@/lib/mock-data";

const TIMEFRAMES = ["7D", "30D", "90D", "1Y"];

export default function WalletsPage() {
  const [timeframe, setTimeframe] = useState("30D");

  return (
    <>
      <DashboardHeader
        title="Wallets"
        subtitle="Manage balances and addresses"
        actions={<button className="btn-primary">+ New wallet</button>}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="card p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="section-label">Total balance</p>
                <p className="text-xl font-semibold tabular-nums text-white">$24,560.00</p>
                <p className="text-2xs text-drift-green">+12.5%</p>
              </div>
              <div className="flex gap-px rounded border border-drift-border">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 text-2xs ${
                      timeframe === tf ? "bg-drift-hover text-white" : "text-drift-muted hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <WalletBalanceChart />
          </div>

          <div className="card mt-4 overflow-hidden">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-drift-border text-left text-2xs text-drift-muted">
                  <th className="px-4 py-2 font-medium">Wallet</th>
                  <th className="px-4 py-2 font-medium text-right">Balance</th>
                  <th className="px-4 py-2 font-medium">Network</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="border-b border-drift-border hover:bg-drift-hover/50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={wallet.symbol} size="md" />
                        <div>
                          <p className="text-white">{wallet.name}</p>
                          {wallet.isPrimary && (
                            <span className="text-2xs text-drift-muted">Primary</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <p className="tabular-nums text-white">{wallet.balance} {wallet.symbol}</p>
                      <p className="text-2xs tabular-nums text-drift-muted">${wallet.usdValue.toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-2xs text-drift-muted">{wallet.network}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-2xs text-drift-muted">
                        {wallet.address.slice(0, 8)}…{wallet.address.slice(-4)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !px-2 !py-1">Deposit</button>
                        <button className="btn-ghost !px-2 !py-1">Withdraw</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        <aside className="hidden w-52 shrink-0 overflow-y-auto border-l border-drift-border p-4 xl:block">
          <p className="section-label mb-2">Activity</p>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="border-b border-drift-border pb-2 last:border-0">
                <p className="text-xs text-white">{item.title}</p>
                <p className="truncate text-2xs text-drift-muted">{item.from}</p>
                <div className="mt-0.5 flex justify-between text-2xs">
                  <span className={item.type === "received" ? "text-drift-green" : "text-drift-red"}>
                    {item.amount}
                  </span>
                  <span className="text-drift-muted">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
