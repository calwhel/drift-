"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "../logo";
import { Icon, type IconName } from "../icons";

const adminNavItems = [
  { label: "Overview", href: "/admin/overview", icon: "LayoutDashboard" },
  { label: "Users", href: "/admin/users", icon: "Users" },
  { label: "Transactions", href: "/admin/transactions", icon: "ArrowRightLeft" },
  { label: "Platform Wallets", href: "/admin/wallets", icon: "Wallet" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/overview") {
      return pathname === "/admin/overview" || pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col border-r border-drift-border bg-drift-bg transition-transform lg:static",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-11 items-center justify-between border-b border-drift-border px-3">
          <Logo size="sm" showSubtitle={false} />
          <button onClick={onClose} className="text-drift-muted lg:hidden">
            <Icon name="X" className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-b border-drift-border px-3 py-2">
          <span className="rounded bg-drift-purple/20 px-2 py-0.5 text-2xs font-medium text-drift-purple">
            Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-px">
            {adminNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] transition-colors",
                    isActive(item.href)
                      ? "bg-drift-hover font-medium text-white"
                      : "text-drift-muted hover:bg-drift-hover hover:text-white"
                  )}
                >
                  <Icon name={item.icon as IconName} className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-drift-border p-2">
          <Link
            href="/dashboard/overview"
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-drift-muted hover:bg-drift-hover hover:text-white"
          >
            <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
            Merchant Dashboard
          </Link>
        </div>
      </aside>
    </>
  );
}
