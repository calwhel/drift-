"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";
import { recentLinks, transactions, type TransactionStatus } from "@/lib/mock-data";

const STATUSES: (TransactionStatus | "All")[] = ["All", "Completed", "Pending", "Failed"];
const CURRENCIES = ["All", "USDT", "BTC", "USDC"];
const PER_PAGE = 10;

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "All">("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      if (currencyFilter !== "All" && tx.currency !== currencyFilter) return false;
      return true;
    });
  }, [statusFilter, currencyFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <DashboardHeader
        title="Transactions"
        subtitle="View and manage all your transactions in one place."
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as TransactionStatus | "All"); setPage(1); }}
              className="rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-white focus:border-drift-purple focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
              ))}
            </select>
            <select
              value={currencyFilter}
              onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-white focus:border-drift-purple focus:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === "All" ? "All Currencies" : c}</option>
              ))}
            </select>
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-drift-muted">
              May 1 – May 31, 2024
              <Icon name="ChevronDown" className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-sm text-white hover:bg-drift-card-hover">
              <Icon name="Download" className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="rounded-xl border border-drift-border bg-drift-card p-5">
            <TransactionsTable data={paginated} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-drift-muted">
              Showing {(page - 1) * PER_PAGE + 1} to {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-drift-border px-3 py-1.5 text-sm text-drift-muted disabled:opacity-40"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    p === page
                      ? "bg-drift-purple text-white"
                      : "border border-drift-border text-drift-muted hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-drift-border px-3 py-1.5 text-sm text-drift-muted disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-drift-border bg-drift-bg p-6 xl:block">
          <h3 className="mb-3 text-sm font-semibold text-white">Create New</h3>
          <div className="space-y-2">
            {[
              { label: "Create Payment Link", icon: "Link", primary: true, href: "/dashboard/payment-links" },
              { label: "Create Invoice", icon: "FileText", primary: false, href: "/dashboard/invoices" },
              { label: "Create Wallet", icon: "Wallet", primary: false, href: "/dashboard/wallets" },
              { label: "Add Customer", icon: "Users", primary: false, href: "/dashboard/customers" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-sm font-medium transition-colors ${
                  item.primary
                    ? "bg-drift-purple text-white"
                    : "border border-drift-border bg-drift-card text-white hover:bg-drift-card-hover"
                }`}
              >
                <Icon name={item.icon as "Link"} className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Links</h3>
              <Link href="/dashboard/payment-links" className="text-xs text-drift-purple hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentLinks.map((link) => (
                <Link
                  key={link.id}
                  href="/pay/abc123"
                  className="block rounded-lg border border-drift-border bg-drift-card p-3 transition-colors hover:border-drift-purple/30"
                >
                  <div className="flex items-start gap-2">
                    <Icon name="Link" className="mt-0.5 h-4 w-4 shrink-0 text-drift-purple" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{link.title}</p>
                      <p className="truncate text-xs text-drift-purple">{link.url}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-drift-muted">
                        <span>{link.amount} {link.currency}</span>
                        <span>{link.date}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-drift-border bg-drift-card p-4">
            <h3 className="text-sm font-semibold text-white">Need Help?</h3>
            <p className="mt-1 text-xs text-drift-muted">Visit our documentation or contact support.</p>
            <div className="mt-3 flex gap-2">
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-drift-border py-2 text-xs text-white hover:bg-drift-card-hover">
                <Icon name="BookOpen" className="h-3.5 w-3.5" />
                View Docs
              </button>
              <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-drift-border py-2 text-xs text-white hover:bg-drift-card-hover">
                <Icon name="Headphones" className="h-3.5 w-3.5" />
                Contact Support
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
