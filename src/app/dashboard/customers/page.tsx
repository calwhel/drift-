"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";

interface CustomerRow {
  email: string;
  totalSpent: number;
  paymentCount: number;
  currencies: string[];
  lastPaymentAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : { customers: [] }))
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <DashboardHeader
        title="Customers"
        subtitle={loading ? "Loading…" : `${customers.length} paying customers`}
      />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Payments</th>
                <th className="px-4 py-2">Total spent</th>
                <th className="px-4 py-2">Currencies</th>
                <th className="px-4 py-2">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5 text-white">{c.email}</td>
                  <td className="px-4 py-2.5">{c.paymentCount}</td>
                  <td className="px-4 py-2.5 tabular-nums text-white">{c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-drift-muted">{c.currencies.join(", ")}</td>
                  <td className="px-4 py-2.5 text-drift-muted">
                    {new Date(c.lastPaymentAt).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-drift-muted">
                    No completed payments yet.{" "}
                    <Link href="/dashboard/payment-links" className="text-brand-400 hover:underline">
                      Create a payment link
                    </Link>{" "}
                    to get started.
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
