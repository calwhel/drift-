"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon } from "@/components/icons";
import type { Transaction, TransactionStatus } from "@/lib/mock-data";

const STATUSES = ["All", "Completed", "Pending", "Failed", "Confirming"];
const CURRENCIES = ["All", "USDT", "BTC", "USDC", "ETH"];
const PER_PAGE = 10;

function mapStatus(s: string): TransactionStatus {
  const m: Record<string, TransactionStatus> = {
    completed: "Completed",
    confirming: "Pending",
    pending: "Pending",
    failed: "Failed",
  };
  return m[s] ?? "Pending";
}

function mapTx(row: Record<string, string>): Transaction {
  return {
    id: row.id.slice(0, 16).toUpperCase(),
    customer: row.customerEmail ?? "Customer",
    amount: Number(row.amount),
    currency: row.currency,
    status: mapStatus(row.status),
    date: new Date(row.createdAt).toLocaleString(),
  };
}

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [links, setLinks] = useState<Array<{ id: string; title: string; shortCode: string; amount: string; currency: string }>>([]);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PER_PAGE),
    });
    if (statusFilter !== "All") {
      const statusParam = statusFilter === "Pending" ? "confirming" : statusFilter.toLowerCase();
      params.set("status", statusParam);
    }
    if (currencyFilter !== "All") params.set("currency", currencyFilter);

    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data?.map(mapTx) ?? []);
        setTotal(res.total ?? 0);
      });
  }, [page, statusFilter, currencyFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/payment-links")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <DashboardHeader title="Transactions" subtitle={`${total} total`} />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input py-1 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{s === "All" ? "All status" : s}</option>)}
            </select>
            <select value={currencyFilter} onChange={(e) => { setCurrencyFilter(e.target.value); setPage(1); }} className="input py-1 text-xs">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c === "All" ? "All currencies" : c}</option>)}
            </select>
            <button className="btn-secondary ml-auto flex items-center gap-1.5">
              <Icon name="Download" className="h-3 w-3" /> Export
            </button>
          </div>
          <div className="card p-4">
            <TransactionsTable data={data} />
          </div>
          <div className="mt-3 flex items-center justify-between text-2xs text-drift-muted">
            <span>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !px-2 disabled:opacity-30">Prev</button>
              <span className="px-2 text-white">{page}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost !px-2 disabled:opacity-30">Next</button>
            </div>
          </div>
        </main>
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-l border-drift-border p-4 xl:block">
          <p className="section-label mb-2">Recent links</p>
          <div className="space-y-2">
            {links.slice(0, 3).map((link) => (
              <Link key={link.id} href={`/pay/${link.shortCode}`} className="block border-b border-drift-border pb-2">
                <p className="text-xs text-white">{link.title}</p>
                <p className="font-mono text-2xs text-drift-muted">/pay/{link.shortCode}</p>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
