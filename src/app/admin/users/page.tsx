"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { useAdminSidebar } from "@/components/admin/sidebar-context";

interface UserRow {
  id: string;
  email: string;
  businessName: string;
  isAdmin: boolean;
  emailVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { setOpen } = useAdminSidebar();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json();
          throw new Error(data.error ?? "Failed to load users");
        }
        return r.json();
      })
      .then((d) => setUsers(d.data ?? []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <DashboardHeader title="Users" subtitle="All registered merchants" onMenuClick={() => setOpen(true)} />

      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-drift-border text-drift-muted">
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">2FA</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-3 font-medium text-white">{user.businessName}</td>
                  <td className="px-4 py-3 text-drift-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.isAdmin ? (
                      <span className="rounded bg-drift-purple/20 px-2 py-0.5 text-2xs text-drift-purple">
                        Admin
                      </span>
                    ) : (
                      <span className="text-drift-muted">Merchant</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-drift-muted">
                    {user.totpEnabled ? "Enabled" : "Off"}
                  </td>
                  <td className="px-4 py-3 text-drift-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && !error && (
            <p className="p-4 text-sm text-drift-muted">No users found</p>
          )}
        </div>
      </main>
    </>
  );
}
