"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";

export default function SettingsPage() {
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

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [setupStarted, setSetupStarted] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const load2FAStatus = () => {
    fetch("/api/auth/2fa/setup")
      .then((r) => r.json())
      .then((d) => {
        setTwoFactorEnabled(d.enabled ?? false);
        setSetupStarted(d.pendingSetup ?? false);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/team/members")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setOrgName(d.organization?.name ?? "");
      })
      .catch(() => {});
    load2FAStatus();
  }, []);

  const setup2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start 2FA setup");
      setQrDataUrl(data.qrDataUrl ?? "");
      setSetupStarted(true);
      setTwoFactorMessage("Scan the QR code with Google Authenticator, then enter the 6-digit code below.");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const verify2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed");
      setTwoFactorEnabled(true);
      setSetupStarted(false);
      setQrDataUrl("");
      setVerifyCode("");
      setTwoFactorMessage(data.message ?? "Two-factor authentication enabled");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const disable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword, token: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to disable 2FA");
      setTwoFactorEnabled(false);
      setShowDisable(false);
      setDisablePassword("");
      setDisableCode("");
      setTwoFactorMessage(data.message ?? "Two-factor authentication disabled");
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const inviteMember = async () => {
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      setInviteEmail("");
      setTwoFactorMessage(`Invitation sent to ${inviteEmail}`);
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
        <h2 className="section-title mb-4">Security</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <h3 className="section-title mb-3">Change password</h3>
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
            <h3 className="section-title mb-3">Two-factor authentication</h3>
            <p className="mb-3 text-xs text-drift-muted">
              Protect your account with Google Authenticator or any TOTP app.
            </p>

            {twoFactorEnabled ? (
              <div className="space-y-3">
                <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-xs text-drift-green">
                  2FA is enabled on your account
                </p>
                {!showDisable ? (
                  <button
                    type="button"
                    onClick={() => setShowDisable(true)}
                    className="btn-secondary w-full text-drift-red"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <form onSubmit={disable2FA} className="space-y-3">
                    <div>
                      <label className="section-label mb-1 block">Current password</label>
                      <input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        className="input w-full"
                        required
                        disabled={twoFactorLoading}
                      />
                    </div>
                    <div>
                      <label className="section-label mb-1 block">Authenticator code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="input w-full"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={twoFactorLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDisable(false)}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={twoFactorLoading || disableCode.length !== 6}
                        className="btn-primary flex-1"
                      >
                        Confirm disable
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!setupStarted && !qrDataUrl && (
                  <button
                    type="button"
                    onClick={setup2FA}
                    disabled={twoFactorLoading}
                    className="btn-secondary w-full"
                  >
                    Enable 2FA
                  </button>
                )}
                {qrDataUrl && (
                  <div className="flex flex-col items-center rounded border border-drift-border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Scan with Google Authenticator" width={200} height={200} />
                    <p className="mt-2 text-center text-2xs text-gray-600">
                      Scan with Google Authenticator
                    </p>
                  </div>
                )}
                {(setupStarted || qrDataUrl) && (
                  <>
                    <div>
                      <label className="section-label mb-1 block">6-digit verification code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="input w-full text-center tracking-[0.3em]"
                        placeholder="000000"
                        maxLength={6}
                        disabled={twoFactorLoading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={verify2FA}
                      disabled={twoFactorLoading || verifyCode.length !== 6}
                      className="btn-primary w-full"
                    >
                      Verify & enable
                    </button>
                  </>
                )}
              </div>
            )}

            {twoFactorError && (
              <p className="mt-3 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-xs text-drift-red">
                {twoFactorError}
              </p>
            )}
            {twoFactorMessage && (
              <p className="mt-3 rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-xs text-drift-green">
                {twoFactorMessage}
              </p>
            )}
          </div>

          <div className="card p-4 lg:col-span-2">
            <h3 className="section-title mb-3">Team — {orgName}</h3>
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
