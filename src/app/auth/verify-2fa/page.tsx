"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/landing/logo-mark";

export default function Verify2FAPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    if (status === "authenticated" && session?.user?.twoFactorVerified) {
      router.replace("/dashboard/overview");
    }
    if (status === "authenticated" && !session?.user?.twoFactorEnabled) {
      router.replace("/dashboard/overview");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }

      await update({ twoFactorVerified: true });
      window.location.href = "/dashboard/overview";
    } catch {
      setError("Network error — could not verify code");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-drift-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoMark />
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-drift-muted">
            Enter the 6-digit code from your authenticator app
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
                {error}
              </p>
            )}
            <div>
              <label className="section-label mb-1 block">Authenticator code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="input w-full text-center text-lg tracking-[0.3em]"
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full py-2">
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="mt-4 w-full text-center text-sm text-drift-muted hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
