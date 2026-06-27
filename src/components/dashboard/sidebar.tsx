"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/mock-data";
import { LogoMark } from "../landing/logo-mark";
import { Icon, type IconName } from "../icons";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);

  const isActive = (href: string) => {
    if (href === "/dashboard/overview") {
      return pathname === "/dashboard/overview" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-drift-border bg-[#0b0b11] transition-transform lg:static",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <LogoMark />
          <button onClick={onClose} className="text-drift-muted lg:hidden">
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)]"
                        : "text-drift-muted hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon name={item.icon as IconName} className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-3 px-3 pb-3">
          <div className="rounded-xl border border-[#7c3aed40] bg-gradient-to-b from-[#7c3aed1f] to-[#7c3aed0a] p-4 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#7c3aed29]">
              <Icon name="Crown" className="h-[18px] w-[18px] text-[#c4b5fd]" />
            </div>
            <p className="text-[13px] font-semibold text-white">Upgrade to Pro</p>
            <p className="mx-auto mt-1 max-w-[180px] text-[11px] leading-snug text-drift-muted">
              Unlock advanced features and lower fees
            </p>
            <button className="mt-3 w-full rounded-lg bg-[#7c3aed] py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#6d28d9]">
              Upgrade Now
            </button>
          </div>

          <button
            onClick={() => setDarkMode((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] text-drift-muted hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <Icon name="Moon" className="h-4 w-4" />
              Dark Mode
            </span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                darkMode ? "bg-[#7c3aed]" : "bg-[#2a2a38]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  darkMode ? "translate-x-[18px]" : "translate-x-0.5"
                )}
              />
            </span>
          </button>

          <div className="flex items-center gap-2.5 rounded-lg border border-drift-border bg-drift-card px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-[11px] font-semibold text-white">
              JD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">John Doe</p>
              <p className="truncate text-[11px] text-drift-muted">Business Account</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
