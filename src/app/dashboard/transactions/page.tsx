"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Search, Download } from "lucide-react";
import type { Transaction, TransactionStatus } from "@/lib/mock-data";

const PER_PAGE = 10;
const STATUSES = ["all", "completed", "pending", "failed", "confirming"];

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
  const { status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const load = useCallback(() => {
    if (status !== "authenticated") return;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PER_PAGE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    setLoading(true);
    fetch(`/api/transactions?${params}`)
      .then((r) => (r.ok ? r.json() : { data: [], total: 0 }))
      .then((res) => {
        setTransactions(res.data?.map(mapTx) ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, page, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    load();
  }, [status, router, load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (status === "loading" || (loading && transactions.length === 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Transactions" subtitle={`${total} total`} />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-300 focus:border-brand-500 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/10">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          {loading && transactions.length > 0 ? (
            <div className="px-4 py-2 text-xs text-gray-500">Searching…</div>
          ) : null}
          <TransactionsTable data={transactions} />
          {!loading && transactions.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-gray-500">
              {debouncedSearch ? `No transactions matching "${debouncedSearch}"` : "No transactions yet"}
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
