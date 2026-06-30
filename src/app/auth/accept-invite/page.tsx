"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const { status } = useSession();
  const [invite, setInvite] = useState<{
    email: string;
    organization_name: string;
    role: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token");
      return;
    }
    fetch(`/api/team/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Invalid invitation");
        setInvite(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Invalid invitation"));
  }, [token]);

  const acceptInvite = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept invitation");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/overview"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#08080d] px-4">
      <div className="w-full max-w-md rounded-2xl border border-drift-border bg-[#0d0d15] p-8">
        <LogoMark />
        <h1 className="mt-6 text-xl font-bold text-white">Team invitation</h1>

        {error && !invite && (
          <p className="mt-4 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {invite && !success && (
          <>
            <p className="mt-3 text-sm text-drift-muted">
              You&apos;ve been invited to join <span className="text-white">{invite.organization_name}</span> as{" "}
              <span className="text-white">{invite.role}</span>.
            </p>
            <p className="mt-2 text-xs text-drift-muted">Invitation sent to: {invite.email}</p>

            {status === "unauthenticated" ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-drift-muted">Sign in or create an account with {invite.email} to continue.</p>
                <Link
                  href={`/auth/login?callbackUrl=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                  className="btn-primary block w-full py-2.5 text-center"
                >
                  Sign in
                </Link>
                <Link
                  href={`/auth/signup?email=${encodeURIComponent(invite.email)}&callbackUrl=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                  className="btn-secondary block w-full py-2.5 text-center"
                >
                  Create account
                </Link>
              </div>
            ) : (
              <div className="mt-6">
                {error && (
                  <p className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}
                <button onClick={acceptInvite} disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? "Joining…" : "Accept invitation"}
                </button>
              </div>
            )}
          </>
        )}

        {success && (
          <p className="mt-4 text-sm text-drift-green">You joined the team. Redirecting to dashboard…</p>
        )}

        <p className="mt-6 text-center text-xs text-drift-muted">
          <Link href="/" className="text-brand-400 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#08080d] text-drift-muted">Loading…</div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
