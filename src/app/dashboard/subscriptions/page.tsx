"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";

interface Subscription {
  id: string;
  planName: string;
  customerEmail: string;
  amount: string;
  currency: string;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [planName, setPlanName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState("month");
  const [loading, setLoading] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const load = () => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSubs)
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_name: planName,
        customer_email: customerEmail,
        amount: Number(amount),
        interval,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setLastLink(data.payment_link);
      setShowCreate(false);
      setPlanName("");
      setCustomerEmail("");
      setAmount("");
      load();
    }
  };

  return (
    <>
      <DashboardHeader
        title="Customer Subscriptions"
        subtitle="Set up recurring billing plans for your clients — Drift is free to use, pay only per transaction."
      >
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5">
          <Icon name="Plus" className="h-3 w-3" />
          New plan
        </button>
      </DashboardHeader>
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {showCreate && (
          <div className="card mb-4 space-y-3 p-4">
            <p className="text-xs text-drift-muted">
              Create a recurring plan for one of your customers. They&apos;ll receive a payment link to subscribe.
            </p>
            <input
              placeholder="Plan name (e.g. Premium Membership)"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="input w-full"
            />
            <input
              placeholder="Customer email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="input w-full"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
              />
              <select value={interval} onChange={(e) => setInterval(e.target.value)} className="input">
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={loading || !planName || !customerEmail || !amount} className="btn-primary">
              {loading ? "Creating…" : "Create plan for customer"}
            </button>
            {lastLink && (
              <p className="text-xs text-drift-green">
                Payment link for your customer:{" "}
                <Link href={lastLink} className="underline">
                  {lastLink}
                </Link>
              </p>
            )}
          </div>
        )}
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2">Plan</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Interval</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5 text-white">{sub.planName}</td>
                  <td className="px-4 py-2.5">{sub.customerEmail}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {sub.amount} {sub.currency}
                  </td>
                  <td className="px-4 py-2.5 capitalize">{sub.interval}ly</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={sub.status === "active" ? "Completed" : "Pending"} />
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-drift-muted">
                    No customer subscription plans yet. Create one to start billing your clients on a recurring schedule.
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
