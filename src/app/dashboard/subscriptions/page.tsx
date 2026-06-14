"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { formatInterval } from "@/lib/subscriptions/intervals";

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  amount: string;
  currency: string;
  network: string;
  interval: string;
  shortCode: string;
  subscribe_url: string;
  status: string;
  createdAt: string;
}

interface Subscriber {
  id: string;
  planName: string | null;
  customerEmail: string | null;
  customerName: string | null;
  amount: string;
  currency: string;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface Stats {
  active: number;
  pastDue: number;
  paused: number;
  pending: number;
  cancelled: number;
  churnRate: number;
  mrr: number;
  revenue30d: number;
  planCount: number;
}

interface WalletOption {
  id: string;
  currency: string;
  network: string;
  label: string | null;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [walletId, setWalletId] = useState("");
  const [interval, setInterval] = useState("month");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = () => {
    fetch("/api/subscription-plans").then((r) => r.json()).then(setPlans).catch(() => {});
    fetch("/api/subscriptions").then((r) => r.json()).then(setSubscribers).catch(() => {});
    fetch("/api/subscriptions?stats=1").then((r) => r.json()).then(setStats).catch(() => {});
  };

  useEffect(() => {
    load();
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => setWallets(d.wallets ?? []))
      .catch(() => {});
  }, []);

  const walletsForCurrency = useMemo(
    () => wallets.filter((w) => w.currency === currency),
    [wallets, currency]
  );

  useEffect(() => {
    if (walletsForCurrency.length > 0 && !walletsForCurrency.find((w) => w.id === walletId)) {
      setWalletId(walletsForCurrency[0].id);
    } else if (walletsForCurrency.length === 0) {
      setWalletId("");
    }
  }, [walletsForCurrency, walletId]);

  const handleCreatePlan = async () => {
    if (!walletId) {
      setError("Create a wallet for this currency in Wallets first");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/subscription-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        amount: Number(amount),
        currency,
        wallet_id: walletId,
        interval,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setShowCreate(false);
      setName("");
      setDescription("");
      setAmount("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create plan");
    }
  };

  const handleAction = async (id: string, action: "pause" | "resume" | "cancel") => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  };

  const copyLink = (path: string) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
    setCopied(path);
    setTimeout(() => setCopied(""), 2000);
  };

  const statusLabel = (status: string) => {
    if (status === "active") return "Completed";
    if (status === "past_due") return "Failed";
    if (status === "paused") return "Pending";
    if (status === "cancelled") return "Failed";
    return "Pending";
  };

  return (
    <>
      <DashboardHeader
        title="Subscriptions"
        subtitle={`${stats?.active ?? 0} active subscribers`}
      >
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5">
          <Icon name="Plus" className="h-3 w-3" />
          New plan
        </button>
      </DashboardHeader>
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="card p-4">
              <p className="section-label">Active</p>
              <p className="text-xl font-semibold tabular-nums text-white">{stats.active}</p>
            </div>
            <div className="card p-4">
              <p className="section-label">MRR</p>
              <p className="text-xl font-semibold tabular-nums text-white">${stats.mrr.toFixed(2)}</p>
            </div>
            <div className="card p-4">
              <p className="section-label">Revenue (30d)</p>
              <p className="text-xl font-semibold tabular-nums text-white">${stats.revenue30d.toFixed(2)}</p>
            </div>
            <div className="card p-4">
              <p className="section-label">Churn (30d)</p>
              <p className="text-xl font-semibold tabular-nums text-white">{stats.churnRate}%</p>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="card mb-4 space-y-3 p-4">
            <h3 className="section-title">Create subscription plan</h3>
            <input placeholder="Plan name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input w-full min-h-[60px]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="input">
                {walletsForCurrency.length === 0 ? (
                  <option value="">No wallet — create one first</option>
                ) : (
                  walletsForCurrency.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label ?? `${w.currency} (${w.network})`}
                    </option>
                  ))
                )}
              </select>
              <select value={interval} onChange={(e) => setInterval(e.target.value)} className="input">
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            {error && <p className="text-xs text-drift-red">{error}</p>}
            <button onClick={handleCreatePlan} disabled={loading || !name || !amount} className="btn-primary">
              {loading ? "Creating…" : "Create plan"}
            </button>
          </div>
        )}

        <h2 className="section-title mb-3">Plans</h2>
        <div className="card mb-6 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Interval</th>
                <th className="px-4 py-2">Subscribe link</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5">
                    <p className="text-white">{plan.name}</p>
                    {plan.description && <p className="text-drift-muted">{plan.description}</p>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{plan.amount} {plan.currency}</td>
                  <td className="px-4 py-2.5">{formatInterval(plan.interval)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Link href={plan.subscribe_url} className="text-drift-purple hover:underline">
                        {plan.subscribe_url}
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyLink(plan.subscribe_url)}
                        className="btn-secondary !px-2"
                      >
                        <Icon name="Copy" className="h-3 w-3" />
                      </button>
                      {copied === plan.subscribe_url && (
                        <span className="text-2xs text-drift-green">Copied</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-drift-muted">
                    No subscription plans yet. Create one to get a shareable link.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="section-title mb-3">Subscribers</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Next billing</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5 text-white">{sub.planName ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <p className="text-white">{sub.customerName ?? sub.customerEmail}</p>
                    {sub.customerName && <p className="text-drift-muted">{sub.customerEmail}</p>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{sub.amount} {sub.currency}</td>
                  <td className="px-4 py-2.5">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={statusLabel(sub.status)} />
                    {sub.status === "past_due" && (
                      <span className="ml-1 text-2xs text-drift-red">Past due</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {sub.status === "paused" ? (
                        <button
                          type="button"
                          onClick={() => handleAction(sub.id, "resume")}
                          className="btn-secondary !px-2 text-2xs"
                        >
                          Resume
                        </button>
                      ) : sub.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleAction(sub.id, "pause")}
                          className="btn-secondary !px-2 text-2xs"
                        >
                          Pause
                        </button>
                      )}
                      {sub.status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleAction(sub.id, "cancel")}
                          className="btn-secondary !px-2 text-2xs text-drift-red"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-drift-muted">
                    No subscribers yet. Share a plan link to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
