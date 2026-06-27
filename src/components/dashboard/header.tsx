"use client";

import { Icon } from "../icons";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, emoji, onMenuClick, actions, children }: DashboardHeaderProps) {
  return (
    <header className="border-b border-drift-border bg-drift-bg">
      <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={onMenuClick} className="text-drift-muted lg:hidden">
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
                placeholder="Search anything..."
                className="w-full rounded-lg border border-drift-border bg-drift-card py-2.5 pl-10 pr-14 text-[13px] text-white placeholder:text-drift-muted focus:border-[#3f3f50] focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-drift-border px-1.5 py-0.5 text-[10px] text-drift-muted">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {actions}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-drift-border bg-drift-card text-drift-muted hover:text-white">
              <Icon name="Bell" className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-drift-red" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-drift-border bg-drift-card py-1 pl-1 pr-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-[11px] font-semibold text-white">
                JD
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[12px] font-medium leading-tight text-white">John Doe</span>
                <span className="block text-[10px] leading-tight text-drift-muted">Business Account</span>
              </span>
              <Icon name="ChevronDown" className="hidden h-3.5 w-3.5 text-drift-muted sm:block" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
