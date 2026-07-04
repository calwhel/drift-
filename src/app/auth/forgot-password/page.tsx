"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setMessage(data.message ?? "If an account exists, a reset link has been sent.");
    } catch {
      setError("Network error — could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoMark />
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white">Forgot password</h1>
          <p className="mt-1 text-sm text-drift-muted">We&apos;ll email you a reset link</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {message && (
              <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
                {error}
              </p>
            )}
            <div>
              <label className="section-label mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-drift-muted">
            <Link href="/auth/login" className="text-drift-purple hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
