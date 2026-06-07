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
      <div className="flex flex-col gap-2 px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={onMenuClick} className="text-drift-muted lg:hidden">
              <Icon name="Menu" className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-white">{title}</h1>
              {subtitle && <p className="text-2xs text-drift-muted">{subtitle}</p>}
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-6 md:flex">
            <div className="relative w-full max-w-xs">
              <Icon name="Search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-drift-muted" />
              <input
                type="text"
                placeholder="Search"
                className="input w-full py-1.5 pl-8 pr-12 text-xs"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-drift-muted">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <button className="btn-ghost !p-1.5">
              <Icon name="Bell" className="h-3.5 w-3.5" />
            </button>
            <div className="hidden h-6 w-6 items-center justify-center rounded-sm bg-drift-hover text-2xs font-medium text-white sm:flex">
              JD
            </div>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
