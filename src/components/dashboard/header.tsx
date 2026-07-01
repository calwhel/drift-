"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "../icons";
import { useAdminSidebar } from "../admin/sidebar-context";
import { useSidebarOptional } from "./sidebar-context";
import { useSession } from "next-auth/react";
import { getUserInitials } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, emoji, onMenuClick, actions, children }: DashboardHeaderProps) {
  const router = useRouter();
  const dashboardSidebar = useSidebarOptional();
  const adminSidebar = useAdminSidebar();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const displayName = session?.user?.name ?? session?.user?.email ?? "Account";
  const initials = getUserInitials(session?.user?.name ?? session?.user?.email);

  const handleMenuClick =
    onMenuClick ??
    (() => {
      if (dashboardSidebar) {
        dashboardSidebar.toggle();
      } else {
        adminSidebar.setOpen(true);
      }
    });

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/dashboard/transactions?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="border-b border-drift-border bg-drift-bg">
      <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleMenuClick}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-drift-muted hover:bg-white/5 lg:hidden"
            >
              <Icon name="Menu" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 truncate text-xl font-bold tracking-tight text-white">
                {title}
                {emoji && <span>{emoji}</span>}
              </h1>
              {subtitle && <p className="truncate text-[13px] text-drift-muted">{subtitle}</p>}
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-6 lg:flex">
            <div className="relative w-full max-w-md">
              <Icon name="Search" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-drift-muted" />
              <input
                type="text"
                placeholder="Search transactions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch();
                }}
                className="w-full rounded-lg border border-drift-border bg-drift-card py-2.5 pl-10 pr-4 text-[13px] text-white placeholder:text-drift-muted focus:border-[#3f3f50] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {actions}
            <Link
              href="/dashboard/transactions"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-drift-border bg-drift-card text-drift-muted hover:text-white"
              aria-label="Transactions"
            >
              <Icon name="Bell" className="h-[18px] w-[18px]" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card py-1 pl-1 pr-2.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[140px] truncate text-[12px] font-medium leading-tight text-white">
                  {displayName}
                </span>
                <span className="block text-[10px] leading-tight text-drift-muted">Business Account</span>
              </span>
              <Icon name="ChevronDown" className="hidden h-3.5 w-3.5 text-drift-muted sm:block" />
            </Link>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
