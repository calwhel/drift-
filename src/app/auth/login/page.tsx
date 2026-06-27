"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  Configuration: "Server auth misconfiguration — check NEXTAUTH_URL and NEXTAUTH_SECRET",
  Callback: "Authentication callback failed",
  Default: "Sign in failed. Please try again.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered") === "1";
  const authError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const signInPromise = signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: "/dashboard/overview",
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Sign in timed out. Please try again.")), 15000)
      );

      const res = await Promise.race([signInPromise, timeoutPromise]);

      if (!res) {
        setError("No response from auth server. Check NEXTAUTH_URL is set correctly.");
        return;
      }

      if (res.error) {
        setError(ERROR_MESSAGES[res.error] ?? `Sign in failed: ${res.error}`);
        return;
      }

      if (!res.ok) {
        setError(`Sign in failed (status ${res.status})`);
        return;
      }

      const session = await getSession();
      if (session?.user?.twoFactorEnabled && !session?.user?.twoFactorVerified) {
        window.location.assign("/auth/verify-2fa");
        return;
      }

      // Always stay on the current host — never follow a stale NEXTAUTH_URL redirect.
      window.location.assign("/dashboard/overview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error — could not reach the server"
      );
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
          <h1 className="text-lg font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-drift-muted">Access your Drift Payment dashboard</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {registered && (
              <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
                Account created! Sign in with your email and password.
              </p>
            )}
            {success && (
              <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
                {success}
              </p>
            )}
            {error && (
              <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
                {error}
              </p>
            )}
            {authError && !error && (
              <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
                {ERROR_MESSAGES[authError] ?? ERROR_MESSAGES.Default}
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
            <div>
              <label className="section-label mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-drift-muted">
            No account?{" "}
            <Link href="/auth/signup" className="text-drift-purple hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] text-drift-muted">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
