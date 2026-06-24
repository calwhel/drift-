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

function mapStatus(status: string): "Completed" | "Pending" | "Failed" {
  if (status === "active") return "Completed";
  if (status === "cancelled") return "Failed";
  return "Pending";
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
    fetch("/api/subscriptions").then((r) => r.json()).then(setSubs).catch(() => {});
  };

  useEffect(() => { load(); }, []);

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
      load();
    }
  };

  const updateSubscriptionStatus = async (id: string, status: "active" | "cancelled") => {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  };

  return (
    <>
      <DashboardHeader title="Subscriptions" subtitle={`${subs.length} active plans`}>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5">
          <Icon name="Plus" className="h-3 w-3" />
          New subscription
        </button>
      </DashboardHeader>
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {showCreate && (
          <div className="card mb-4 space-y-3 p-4">
            <input placeholder="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} className="input w-full" />
            <input placeholder="Customer email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input w-full" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
              <select value={interval} onChange={(e) => setInterval(e.target.value)} className="input">
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={loading} className="btn-primary">Create subscription</button>
            {lastLink && <p className="text-xs text-drift-green">Payment link: <Link href={lastLink} className="underline">{lastLink}</Link></p>}
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
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5 text-white">{sub.planName}</td>
                  <td className="px-4 py-2.5">{sub.customerEmail}</td>
                  <td className="px-4 py-2.5 tabular-nums">{sub.amount} {sub.currency}</td>
                  <td className="px-4 py-2.5 capitalize">{sub.interval}ly</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={mapStatus(sub.status)} />
                  </td>
                  <td className="px-4 py-2.5">
                    {sub.status === "cancelled" ? (
                      <button
                        onClick={() => updateSubscriptionStatus(sub.id, "active")}
                        className="text-2xs text-drift-green hover:underline"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => updateSubscriptionStatus(sub.id, "cancelled")}
                        className="text-2xs text-drift-red hover:underline"
                      >
                        Cancel
                      </button>
                    )}
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
