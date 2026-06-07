"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";

interface WalletRow {
  id: string;
  currency: string;
  network: string;
  address: string;
  balance: string;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => {
        setWallets(d.wallets ?? []);
        setTotalBalance(d.totalBalance ?? 0);
      });
  }, []);

  return (
    <>
      <DashboardHeader
        title="Wallets"
        subtitle="Manage balances and addresses"
        actions={<button className="btn-primary">+ New wallet</button>}
      />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="card p-4">
          <p className="section-label">Total balance</p>
          <p className="text-xl font-semibold tabular-nums text-white">
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4">
            <WalletBalanceChart />
          </div>
        </div>
        <div className="card mt-4 overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-drift-border text-left text-2xs text-drift-muted">
                <th className="px-4 py-2 font-medium">Wallet</th>
                <th className="px-4 py-2 font-medium text-right">Balance</th>
                <th className="px-4 py-2 font-medium">Network</th>
                <th className="px-4 py-2 font-medium">Address</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet, i) => (
                <tr key={wallet.id} className="border-b border-drift-border hover:bg-drift-hover/50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={wallet.currency} size="md" />
                      <span className="text-white">{wallet.currency} Wallet</span>
                      {i === 0 && <span className="text-2xs text-drift-muted">Primary</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-white">
                    {Number(wallet.balance).toFixed(4)} {wallet.currency}
                  </td>
                  <td className="px-4 py-2 text-2xs text-drift-muted">{wallet.network}</td>
                  <td className="px-4 py-2 font-mono text-2xs text-drift-muted">
                    {wallet.address.slice(0, 10)}…{wallet.address.slice(-4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
