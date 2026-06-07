"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/mock-data";
import { Logo } from "../logo";
import { Icon, type IconName } from "../icons";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-drift-border bg-drift-bg transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "lg:static"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-drift-border px-5">
          <Logo size="sm" />
          <button onClick={onClose} className="text-drift-muted lg:hidden">
            <Icon name="X" className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-drift-purple text-white"
                      : "text-drift-muted hover:bg-drift-card-hover hover:text-white"
                  )}
                >
                  <Icon name={item.icon as IconName} className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-drift-border p-4">
          <div className="rounded-xl border border-drift-border bg-drift-card p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-drift-purple/10">
              <Icon name="Crown" className="h-4 w-4 text-drift-purple" />
            </div>
            <p className="text-sm font-semibold text-white">Upgrade to Pro</p>
            <p className="mt-1 text-xs text-drift-muted">Unlock advanced features</p>
            <button className="mt-3 w-full rounded-lg border border-drift-purple py-2 text-xs font-medium text-drift-purple transition-colors hover:bg-drift-purple hover:text-white">
              Upgrade Now
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-drift-border bg-drift-card p-3">
            <p className="text-xs text-drift-muted">Total Balance</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-bold text-white">$24,560.00</p>
              <Icon name="Eye" className="h-4 w-4 text-drift-muted" />
            </div>
            <p className="mt-1 text-xs text-drift-green">+12.5% vs Apr 1 - Apr 30</p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-drift-border bg-drift-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-drift-purple text-sm font-bold text-white">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">John Doe</p>
              <p className="text-xs text-drift-muted">Business Account</p>
            </div>
            <Icon name="ChevronDown" className="h-4 w-4 shrink-0 text-drift-muted" />
          </div>
        </div>
      </aside>
    </>
  );
}
