"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";
import { MERCHANT_WALLET_NETWORKS, getNetworkLabel } from "@/lib/constants";
import { walletQuickActions } from "@/lib/mock-data";

const RANGES = ["7D", "30D", "90D", "1Y"];

const networkBadge: Record<string, string> = {
  TRC20: "bg-[#7c3aed29] text-[#c4b5fd]",
  ERC20: "bg-[#3b82f629] text-[#93c5fd]",
  SPL: "bg-[#14b8a629] text-[#5eead4]",
  Bitcoin: "bg-[#f59e0b29] text-[#fbbf24]",
  BEP20: "bg-[#eab30829] text-[#fde047]",
  Solana: "bg-[#14b8a629] text-[#5eead4]",
};

const tileClass: Record<string, string> = {
  purple: "tile-purple",
  blue: "tile-blue",
  green: "tile-green",
  orange: "tile-orange",
};

interface WalletRow {
  id: string;
  currency: string;
  network: string;
  address: string;
  balance: string;
  walletType: string;
  label: string | null;
}

interface ActivityItem {
  title: string;
  party: string;
  amount: string;
  positive: boolean;
  date: string;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [range, setRange] = useState("30D");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const [connectAddress, setConnectAddress] = useState<Record<string, string>>({});
  const [withdrawWalletId, setWithdrawWalletId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const loadActivity = useCallback(() => {
    Promise.all([
      fetch("/api/transactions?limit=8&page=1").then((r) => (r.ok ? r.json() : { data: [] })),
      fetch("/api/withdrawals").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([txRes, withdrawals]) => {
        type SortableActivity = ActivityItem & { sortAt: number };
        const items: SortableActivity[] = [];

        for (const tx of txRes.data ?? []) {
          const completed = tx.status === "completed";
          items.push({
            title: completed ? "Payment Received" : "Payment",
            party: tx.customerEmail ? `From: ${tx.customerEmail}` : "Incoming payment",
            amount: `${completed ? "+" : ""}${Number(tx.amount).toFixed(4)} ${tx.currency}`,
            positive: completed,
            date: new Date(tx.createdAt).toLocaleString(),
            sortAt: new Date(tx.createdAt).getTime(),
          });
        }

        const withdrawalRows = Array.isArray(withdrawals) ? withdrawals : [];
        for (const w of withdrawalRows.slice(0, 8)) {
          const addr = w.toAddress as string;
          items.push({
            title: "Withdrawal",
            party: `To: ${addr.slice(0, 6)}…${addr.slice(-4)}`,
            amount: `-${Number(w.amount).toFixed(4)} ${w.currency}`,
            positive: false,
            date: new Date(w.createdAt).toLocaleString(),
            sortAt: new Date(w.createdAt).getTime(),
          });
        }

        items.sort((a, b) => b.sortAt - a.sortAt);
        setActivity(
          items.slice(0, 4).map((item) => ({
            title: item.title,
            party: item.party,
            amount: item.amount,
            positive: item.positive,
            date: item.date,
          }))
        );
      })
      .catch(() => setActivity([]));
  }, []);

  const load = useCallback(() => {
    fetch("/api/wallets")
      .then((r) => (r.ok ? r.json() : { wallets: [], totalBalance: 0 }))
      .then((d) => {
        setWallets(d.wallets ?? []);
        setTotalBalance(d.totalBalance ?? 0);
      })
      .catch(() => {});
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    load();
  }, [load]);

  const walletForNetwork = (currency: string, network: string) =>
    wallets.find((w) => w.currency === currency && w.network === network);

  const connectWallet = async (currency: string, network: string) => {
    const key = `${currency}|${network}`;
    const address = connectAddress[key]?.trim();
    if (!address) {
      setError("Enter a wallet address");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "connected", currency, network, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect wallet");
      setSuccess(`${currency} wallet connected`);
      setActiveNetwork(null);
      setShowAddWallet(false);
      setConnectAddress((prev) => ({ ...prev, [key]: "" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const generateWallet = async (currency: string, network: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generated", currency, network }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate wallet");
      setSuccess(`Drift generated a new ${currency} wallet`);
      setShowAddWallet(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawWalletId) return;
    setWithdrawLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: withdrawWalletId,
          amount: Number(withdrawAmount),
          to_address: withdrawAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");
      setSuccess("Withdrawal submitted");
      setWithdrawWalletId(null);
      setWithdrawAmount("");
      setWithdrawAddress("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setSuccess("Address copied");
  };

  const availableNetworks = MERCHANT_WALLET_NETWORKS.filter(
    (n) => !walletForNetwork(n.currency, n.network)
  );

  return (
    <>
      <DashboardHeader
        title="Wallets"
        subtitle="Manage all your wallets and view balances."
        actions={
          <button
            onClick={() => setShowAddWallet(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#7c3aed] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#6d28d9]"
          >
            <Icon name="Plus" className="h-4 w-4" />
            <span className="hidden sm:inline">Create Wallet</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
            {success}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="card-elevated p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] text-drift-muted">Total Balance</p>
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
                <span className="text-3xl font-bold tabular-nums text-white">
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-3">
                <WalletBalanceChart />
              </div>
            </div>

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
                              <CryptoIcon symbol={w.currency} size="md" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-medium text-white">
                                    {w.label ?? w.currency}
                                  </span>
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                      w.walletType === "generated"
                                        ? "bg-[#7c3aed29] text-[#c4b5fd]"
                                        : "bg-white/10 text-drift-muted"
                                    )}
                                  >
                                    {w.walletType === "generated" ? "Custodial" : "Connected"}
                                  </span>
                                </div>
                                <span className="text-[11px] text-drift-muted">
                                  {getNetworkLabel(w.currency, w.network)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-[13px] font-medium tabular-nums text-white">
                              {Number(w.balance).toFixed(4)} {w.currency}
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
                              <span className="font-mono text-[12px] text-drift-muted">
                                {w.address.slice(0, 6)}…{w.address.slice(-4)}
                              </span>
                              <button
                                onClick={() => copyAddress(w.address)}
                                className="text-drift-muted hover:text-white"
                              >
                                <Icon name="Copy" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {w.walletType === "generated" && (
                                <button
                                  onClick={() => setWithdrawWalletId(w.id)}
                                  disabled={Number(w.balance) <= 0}
                                  className="rounded-lg border border-drift-border bg-drift-card px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/5 disabled:opacity-40"
                                >
                                  Withdraw
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {wallets.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-drift-muted">
                            No wallets yet. Create your first wallet below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={() => setShowAddWallet(true)}
                  className="flex w-full items-center justify-center gap-2 border-t border-dashed border-drift-border py-4 text-[13px] text-drift-muted hover:text-white"
                >
                  <Icon name="Plus" className="h-4 w-4" />
                  <span className="font-medium text-white">Create New Wallet</span>
                  <span>— Add a new wallet to start receiving payments</span>
                </button>
              </div>
            </div>
          </div>

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
                {activity.length > 0 ? (
                  activity.map((a, i) => (
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
                        <p
                          className={cn(
                            "text-[13px] font-medium tabular-nums",
                            a.positive ? "text-drift-green" : "text-drift-red"
                          )}
                        >
                          {a.amount}
                        </p>
                        <p className="text-[11px] text-drift-muted">{a.date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] text-drift-muted">No recent activity yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {showAddWallet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card-elevated max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Wallet</h3>
                <button onClick={() => setShowAddWallet(false)} className="text-drift-muted hover:text-white">
                  <Icon name="X" className="h-5 w-5" />
                </button>
              </div>
              {availableNetworks.length === 0 ? (
                <p className="text-sm text-drift-muted">You already have wallets for all supported networks.</p>
              ) : (
                <div className="space-y-4">
                  {availableNetworks.map((net) => {
                    const key = `${net.currency}|${net.network}`;
                    const isConnecting = activeNetwork === key;
                    return (
                      <div key={key} className="rounded-xl border border-drift-border p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <CryptoIcon symbol={net.currency} size="md" />
                          <div>
                            <p className="font-medium text-white">{net.label}</p>
                            <p className="text-[11px] text-drift-muted">{net.network}</p>
                          </div>
                        </div>
                        {!isConnecting ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setActiveNetwork(key)}
                              className="flex-1 rounded-lg border border-drift-border px-3 py-2 text-sm text-white hover:bg-white/5"
                              disabled={loading}
                            >
                              Connect own
                            </button>
                            <button
                              onClick={() => generateWallet(net.currency, net.network)}
                              className="flex-1 rounded-lg bg-[#7c3aed] px-3 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]"
                              disabled={loading}
                            >
                              Generate
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={connectAddress[key] ?? ""}
                              onChange={(e) =>
                                setConnectAddress((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder="Paste your wallet address"
                              className="w-full rounded-lg border border-drift-border bg-drift-bg px-3 py-2 font-mono text-xs text-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => connectWallet(net.currency, net.network)}
                                className="flex-1 rounded-lg bg-[#7c3aed] px-3 py-2 text-sm text-white"
                                disabled={loading}
                              >
                                Connect
                              </button>
                              <button
                                onClick={() => setActiveNetwork(null)}
                                className="rounded-lg border border-drift-border px-3 py-2 text-sm text-drift-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {withdrawWalletId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <form onSubmit={handleWithdraw} className="card-elevated w-full max-w-md p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Withdraw</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-drift-muted">Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    className="w-full rounded-lg border border-drift-border bg-drift-bg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-drift-muted">Destination address</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    required
                    className="w-full rounded-lg border border-drift-border bg-drift-bg px-3 py-2 font-mono text-sm text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="flex-1 rounded-lg bg-[#7c3aed] py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {withdrawLoading ? "Submitting…" : "Submit withdrawal"}
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawWalletId(null)}
                  className="rounded-lg border border-drift-border px-4 py-2 text-sm text-drift-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
