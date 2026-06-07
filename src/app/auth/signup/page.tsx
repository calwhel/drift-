"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

function parseError(data: { error?: unknown }): string {
  const err = data.error;
  if (typeof err === "string") return err;
  if (Array.isArray(err)) {
    return err.map((e) => (typeof e === "object" && e && "message" in e ? String(e.message) : String(e))).join(". ");
  }
  return "Registration failed";
}

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, businessName }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(parseError(data));
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      setError("Account created but sign-in failed. Try logging in manually.");
      return;
    }

    router.push("/dashboard/overview");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <LogoMark />
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-white">Create account</h1>
          <p className="mt-1 text-sm text-drift-muted">Start accepting crypto payments</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
                {error}
              </p>
            )}
            <div>
              <label className="section-label mb-1 block">Business name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="input w-full"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="section-label mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="section-label mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                minLength={8}
                required
              />
              <p className="mt-1 text-2xs text-drift-muted">At least 8 characters</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-drift-muted">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-drift-purple hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
