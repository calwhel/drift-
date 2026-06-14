"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";

export default function SettingsPage() {
  const [totpUri, setTotpUri] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [totpMessage, setTotpMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [members, setMembers] = useState<Array<{ email: string; role: string; businessName: string }>>([]);
  const [orgName, setOrgName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    fetch("/api/team/members")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setOrgName(d.organization?.name ?? "");
      })
      .catch(() => {});
  }, []);

  const setup2FA = async () => {
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const data = await res.json();
    setTotpUri(data.uri ?? "");
    setTotpMessage("Scan the URI with your authenticator app, then enter the 6-digit code below.");
  };

  const verify2FA = async () => {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: totpToken, enable: true }),
    });
    const data = await res.json();
    setTotpMessage(data.ok ? "2FA enabled successfully" : data.error ?? "Verification failed");
  };

  const inviteMember = async () => {
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      setInviteEmail("");
      setTotpMessage(`Invitation sent to ${inviteEmail}`);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error ?? "Failed to change password");
        return;
      }

      setPasswordMessage(data.message ?? "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error — could not reach the server");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Settings" subtitle="Security and team management" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h2 className="section-title mb-3">Change password</h2>
            <p className="mb-3 text-xs text-drift-muted">
              Update your account password. You will stay signed in after saving.
            </p>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="section-label mb-1 block">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input w-full"
                  required
                  autoComplete="current-password"
                  disabled={passwordLoading}
                />
              </div>
              <div>
                <label className="section-label mb-1 block">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={passwordLoading}
                />
              </div>
              <div>
                <label className="section-label mb-1 block">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={passwordLoading}
                />
              </div>
              {passwordError && (
                <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-xs text-drift-red">
                  {passwordError}
                </p>
              )}
              {passwordMessage && (
                <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-xs text-drift-green">
                  {passwordMessage}
                </p>
              )}
              <button type="submit" disabled={passwordLoading} className="btn-primary w-full">
                {passwordLoading ? "Saving…" : "Save password"}
              </button>
            </form>
          </div>

          <div className="card p-4">
            <h2 className="section-title mb-3">Two-factor authentication</h2>
            <p className="mb-3 text-xs text-drift-muted">Add an extra layer of security to your account.</p>
            <button onClick={setup2FA} className="btn-secondary mb-3">Set up 2FA</button>
            {totpUri && (
              <div className="mb-3 rounded border border-drift-border bg-drift-bg p-2">
                <p className="break-all font-mono text-2xs text-drift-muted">{totpUri}</p>
              </div>
            )}
            <input
              value={totpToken}
              onChange={(e) => setTotpToken(e.target.value)}
              placeholder="6-digit code"
              className="input mb-2 w-full"
              maxLength={6}
            />
            <button onClick={verify2FA} disabled={totpToken.length !== 6} className="btn-primary w-full">
              Verify & enable
            </button>
            {totpMessage && <p className="mt-2 text-xs text-drift-muted">{totpMessage}</p>}
          </div>

          <div className="card p-4 lg:col-span-2">
            <h2 className="section-title mb-3">Team — {orgName}</h2>
            <div className="mb-3 flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input flex-1"
              />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="input">
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button onClick={inviteMember} className="btn-primary">Invite</button>
            </div>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.email} className="flex items-center justify-between rounded border border-drift-border px-3 py-2 text-xs">
                  <div>
                    <p className="text-white">{m.businessName}</p>
                    <p className="text-drift-muted">{m.email}</p>
                  </div>
                  <span className="capitalize text-drift-muted">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
