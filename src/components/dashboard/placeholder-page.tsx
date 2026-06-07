"use client";

import { DashboardHeader } from "./header";
import { Icon } from "../icons";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <DashboardHeader title={title} subtitle={subtitle} />
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-xl border border-drift-border bg-drift-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-drift-purple/10">
            <Icon name="Zap" className="h-6 w-6 text-drift-purple" />
          </div>
          <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
          <p className="mt-2 text-sm text-drift-muted">
            The {title} section is part of the Drift Payment platform. Check out the
            built pages via the sidebar: Overview, Transactions, Payment Links, and Wallets.
          </p>
        </div>
      </main>
    </>
  );
}
