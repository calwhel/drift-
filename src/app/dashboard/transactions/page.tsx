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
      <DashboardHeader title="Transactions" subtitle={`${filtered.length} total`} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as TransactionStatus | "All"); setPage(1); }}
              className="input py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All status" : s}</option>
              ))}
            </select>
            <select
              value={currencyFilter}
              onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }}
              className="input py-1 text-xs"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === "All" ? "All currencies" : c}</option>
              ))}
            </select>
            <span className="text-2xs text-drift-muted">May 1 – May 31, 2024</span>
            <button className="btn-secondary ml-auto flex items-center gap-1.5">
              <Icon name="Download" className="h-3 w-3" />
              Export
            </button>
          </div>

          <div className="card p-4">
            <TransactionsTable data={paginated} />
          </div>

          <div className="mt-3 flex items-center justify-between text-2xs text-drift-muted">
            <span>
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost !px-2 disabled:opacity-30"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] rounded px-2 py-1 text-2xs ${
                    p === page ? "bg-drift-hover text-white" : "text-drift-muted hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost !px-2 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden w-56 shrink-0 overflow-y-auto border-l border-drift-border p-4 xl:block">
          <p className="section-label mb-2">Create</p>
          <div className="space-y-px">
            {[
              { label: "Payment link", href: "/dashboard/payment-links" },
              { label: "Invoice", href: "/dashboard/invoices" },
              { label: "Wallet", href: "/dashboard/wallets" },
              { label: "Customer", href: "/dashboard/customers" },
            ].map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-sm px-2 py-1.5 text-xs ${
                  i === 0 ? "bg-drift-purple text-white" : "text-drift-muted hover:bg-drift-hover hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="section-label">Recent links</p>
              <Link href="/dashboard/payment-links" className="text-2xs text-drift-muted hover:text-white">
                All
              </Link>
            </div>
            <div className="space-y-2">
              {recentLinks.map((link) => (
                <Link
                  key={link.id}
                  href="/pay/abc123"
                  className="block border-b border-drift-border pb-2 last:border-0"
                >
                  <p className="text-xs text-white">{link.title}</p>
                  <p className="font-mono text-2xs text-drift-muted">{link.url}</p>
                  <p className="mt-0.5 text-2xs tabular-nums text-drift-muted">
                    {link.amount} {link.currency}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
