"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Reset failed");
        return;
      }

      setMessage(data.message ?? "Password updated.");
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
        Missing reset token. Request a new link from the forgot password page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {message && (
        <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
          {message}{" "}
          <Link href="/auth/login" className="underline">
            Sign in
          </Link>
        </p>
      )}
      {error && (
        <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
          {error}
        </p>
      )}
      <div>
        <label className="section-label mb-1 block">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input w-full"
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="section-label mb-1 block">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input w-full"
          required
          minLength={8}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full py-2">
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoMark />
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white">Reset password</h1>
          <p className="mt-1 text-sm text-drift-muted">Choose a new password for your account</p>
          <Suspense fallback={<p className="mt-6 text-sm text-drift-muted">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
