"use client";

import { DashboardHeader } from "./header";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <DashboardHeader title={title} subtitle={subtitle} />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="card max-w-sm p-6 text-center">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-2xs text-drift-muted">This section is not yet available.</p>
        </div>
      </main>
    </>
  );
}
