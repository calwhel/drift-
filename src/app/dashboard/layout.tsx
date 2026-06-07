"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, useSidebar } from "@/components/dashboard/sidebar-context";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  return (
    <div className="flex min-h-screen bg-drift-bg">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}
