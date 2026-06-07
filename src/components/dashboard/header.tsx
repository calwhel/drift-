"use client";

import { Icon } from "../icons";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, onMenuClick, actions, children }: DashboardHeaderProps) {
  return (
    <header className="border-b border-drift-border bg-drift-bg">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="text-drift-muted lg:hidden">
              <Icon name="Menu" className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
              {subtitle && <p className="mt-0.5 text-sm text-drift-muted">{subtitle}</p>}
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-8 md:flex">
            <div className="relative w-full max-w-md">
              <Icon name="Search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-drift-muted" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-lg border border-drift-border bg-drift-card py-2 pl-10 pr-16 text-sm text-white placeholder:text-drift-muted focus:border-drift-purple focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-drift-border px-1.5 py-0.5 text-[10px] text-drift-muted">
                ⌘ K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            <button className="text-drift-muted hover:text-white">
              <Icon name="Sun" className="h-5 w-5" />
            </button>
            <button className="relative text-drift-muted hover:text-white">
              <Icon name="Bell" className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-drift-red" />
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-drift-purple text-xs font-bold text-white">
                JD
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-white">John Doe</p>
                <p className="text-xs text-drift-muted">Business Account</p>
              </div>
              <Icon name="ChevronDown" className="h-4 w-4 text-drift-muted" />
            </div>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
