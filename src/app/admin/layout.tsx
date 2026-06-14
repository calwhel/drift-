"use client";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminSidebarProvider, useAdminSidebar } from "@/components/admin/sidebar-context";

function AdminShell({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useAdminSidebar();
  return (
    <div className="flex min-h-screen bg-drift-bg">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSidebarProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSidebarProvider>
  );
}
