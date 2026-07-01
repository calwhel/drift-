"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  completedTransactions: number;
  platformRevenue: number;
  totalGrossVolume: number;
  recentTransactions: Array<{
    id: string;
    amount: string;
    currency: string;
    network: string;
    status: string;
    feeAmount: string | null;
    createdAt: string;
    userId: string;
    customerEmail?: string | null;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    businessName: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

export default function AdminOverviewPage() {
  const { setOpen } = useAdminSidebar();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [telegramStatus, setTelegramStatus] = useState<{
    config?: { bot_token: string; admin_chat_id: string; configured: boolean };
    bot?: { ok: boolean; username?: string; error?: string };
    note?: string;
  } | null>(null);
  const [telegramTestMsg, setTelegramTestMsg] = useState("");
  const [telegramTesting, setTelegramTesting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load stats");
        }
        return r.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message));

    fetch("/api/admin/telegram/test")
      .then((r) => r.json())
      .then(setTelegramStatus)
      .catch(() => {});
  }, []);

  const sendTelegramTest = async () => {
    setTelegramTesting(true);
    setTelegramTestMsg("");
    try {
      const res = await fetch("/api/admin/telegram/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.hint ?? "Test failed");
      setTelegramTestMsg(data.message ?? "Test sent!");
      const statusRes = await fetch("/api/admin/telegram/test");
      setTelegramStatus(await statusRes.json());
    } catch (err) {
      setTelegramTestMsg(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTelegramTesting(false);
    }
  };

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0 },
    { label: "Platform Revenue", value: `$${(stats?.platformRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: "Gross Volume", value: `$${(stats?.totalGrossVolume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: "Transactions", value: stats?.totalTransactions ?? 0 },
    { label: "Completed", value: stats?.completedTransactions ?? 0 },
  ];

  return (
    <>
      <DashboardHeader
        title="Admin Overview"
        subtitle="Platform-wide metrics"
        onMenuClick={() => setOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}

        <div className="card flex divide-x divide-drift-border overflow-x-auto">
          {cards.map((card) => (
            <div key={card.label} className="min-w-[140px] flex-1 px-4 py-3">
              <span className="section-label">{card.label}</span>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="card mt-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="section-title">Telegram admin alerts</h2>
              <p className="mt-1 text-2xs text-drift-muted">
                One-way notifications only — the bot will not reply if you message it. Alerts fire on
                payments, signups, support, and withdrawals.
              </p>
              <ul className="mt-2 space-y-1 text-2xs text-drift-muted">
                <li>
                  Bot token:{" "}
                  <span className={telegramStatus?.config?.bot_token === "set" ? "text-drift-green" : "text-drift-red"}>
                    {telegramStatus?.config?.bot_token ?? "unknown"}
                  </span>
                </li>
                <li>
                  Chat ID:{" "}
                  <span
                    className={
                      telegramStatus?.config?.admin_chat_id === "set" ? "text-drift-green" : "text-drift-red"
                    }
                  >
                    {telegramStatus?.config?.admin_chat_id ?? "unknown"}
                  </span>
                </li>
                {telegramStatus?.bot?.ok && (
                  <li>
                    Connected as @{telegramStatus.bot.username}
                  </li>
                )}
                {telegramStatus?.bot && !telegramStatus.bot.ok && telegramStatus.config?.configured && (
                  <li className="text-drift-red">{telegramStatus.bot.error}</li>
                )}
              </ul>
              {!telegramStatus?.config?.configured && (
                <p className="mt-2 text-2xs text-amber-400">
                  Add TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in Railway → your service → Variables,
                  then redeploy.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={sendTelegramTest}
              disabled={telegramTesting}
              className="btn-primary shrink-0 px-4 py-2"
            >
              {telegramTesting ? "Sending…" : "Send test alert"}
            </button>
          </div>
          {telegramTestMsg && (
            <p
              className={`mt-3 text-sm ${
                telegramTestMsg.includes("check your Telegram") ? "text-drift-green" : "text-drift-red"
              }`}
            >
              {telegramTestMsg}
            </p>
          )}
        </section>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Recent Transactions</h2>
              <Link href="/admin/transactions" className="text-2xs text-drift-purple hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {(stats?.recentTransactions ?? []).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded border border-drift-border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">
                      {Number(tx.amount).toFixed(4)} {tx.currency}
                    </p>
                    <p className="text-drift-muted">{tx.network} · {tx.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-drift-green">+${Number(tx.feeAmount ?? 0).toFixed(4)} fee</p>
                    <p className="text-drift-muted">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!stats?.recentTransactions?.length && (
                <p className="text-sm text-drift-muted">No transactions yet</p>
              )}
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Recent Users</h2>
              <Link href="/admin/users" className="text-2xs text-drift-purple hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-2">
              {(stats?.recentUsers ?? []).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded border border-drift-border px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-white">{user.businessName}</p>
                    <p className="text-drift-muted">{user.email}</p>
                  </div>
                  <div className="text-right">
                    {user.isAdmin && (
                      <span className="rounded bg-drift-purple/20 px-1.5 py-0.5 text-2xs text-drift-purple">
                        Admin
                      </span>
                    )}
                    <p className="mt-1 text-drift-muted">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!stats?.recentUsers?.length && (
                <p className="text-sm text-drift-muted">No users yet</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
