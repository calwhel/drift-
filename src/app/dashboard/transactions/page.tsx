"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { TransactionsTable } from "@/components/dashboard/transactions-table";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";
import { transactionsQuickActions, recentLinks, TRANSACTIONS_TOTAL } from "@/lib/mock-data";

const tileClass: Record<string, string> = {
  purple: "tile-purple",
  blue: "tile-blue",
  green: "tile-green",
  orange: "tile-orange",
};

function FilterSelect({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-[12px] text-white">
      {label}
      <Icon name="ChevronDown" className="h-3.5 w-3.5 text-drift-muted" />
    </button>
  );
}

export default function TransactionsPage() {
  const { setOpen } = useSidebar();
  const pages = [1, 2, 3];

  return (
    <>
      <DashboardHeader
        title="Transactions"
        subtitle="View and manage all your transactions in one place."
        onMenuClick={() => setOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <FilterSelect label="All Status" />
            <FilterSelect label="All Currencies" />
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-[12px] text-white">
              <Icon name="Calendar" className="h-3.5 w-3.5 text-drift-muted" />
              May 1 – May 31, 2024
              <Icon name="ChevronDown" className="h-3.5 w-3.5 text-drift-muted" />
            </button>
            <button className="ml-auto flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card px-3 py-2 text-[12px] text-white">
              <Icon name="Download" className="h-3.5 w-3.5 text-drift-muted" />
              Export
            </button>
          </div>

          <div className="card-elevated p-5">
            <TransactionsTable showChevron />

            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-drift-border pt-4 sm:flex-row">
              <span className="text-[12px] text-drift-muted">
                Showing 1 to 10 of {TRANSACTIONS_TOTAL} results
              </span>
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-drift-border text-drift-muted hover:text-white">
                  <Icon name="ChevronLeft" className="h-4 w-4" />
                </button>
                {pages.map((p) => (
                  <button
                    key={p}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-[12px]",
                      p === 1
                        ? "bg-[#7c3aed] font-semibold text-white"
                        : "border border-drift-border text-drift-muted hover:text-white"
                    )}
                  >
                    {p}
                  </button>
                ))}
                <span className="px-1 text-[12px] text-drift-muted">…</span>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-drift-border text-[12px] text-drift-muted hover:text-white">
                  36
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-drift-border text-drift-muted hover:text-white">
                  <Icon name="ChevronRight" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[300px] shrink-0 space-y-4 overflow-y-auto border-l border-drift-border p-5 xl:block">
          <div>
            <h3 className="text-[15px] font-semibold text-white">Create New</h3>
            <p className="mt-0.5 text-[12px] text-drift-muted">Create payment links or invoices.</p>
            <div className="mt-3 space-y-2.5">
              {transactionsQuickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-drift-border bg-drift-card p-3 transition-colors hover:bg-white/5"
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tileClass[action.color])}>
                    <Icon name={action.icon as IconName} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-white">{action.label}</span>
                    <span className="block text-[11px] text-drift-muted">{action.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-white">Recent Links</h3>
              <Link href="/dashboard/payment-links" className="text-[12px] text-[#a78bfa] hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentLinks.map((link) => (
                <div key={link.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg tile-purple">
                    <Icon name="Link2" className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white">{link.title}</p>
                    <p className="truncate text-[11px] text-drift-muted">{link.url}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-white">{link.priceDisplay}</p>
                    <p className="text-[11px] text-drift-muted">{link.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4">
            <h3 className="text-[14px] font-semibold text-white">Need Help?</h3>
            <p className="mt-1 text-[12px] text-drift-muted">Visit our documentation or contact support.</p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/developers"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-drift-border bg-drift-card py-2 text-[12px] font-medium text-white hover:bg-white/5"
              >
                <Icon name="BookOpen" className="h-3.5 w-3.5" />
                View Docs
              </Link>
              <Link
                href="/developers"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-drift-border bg-drift-card py-2 text-[12px] font-medium text-white hover:bg-white/5"
              >
                <Icon name="Headphones" className="h-3.5 w-3.5" />
                Support
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
