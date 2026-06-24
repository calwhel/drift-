"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AcceptInviteClientProps = {
  token: string;
};

export default function AcceptInviteClient({ token }: AcceptInviteClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = async () => {
    setError(null);
    setMessage(null);
    if (!token) {
      setError("Missing invitation token.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to accept invitation.");
        return;
      }

      setMessage("Invitation accepted. Redirecting to settings…");
      setTimeout(() => router.push("/dashboard/settings"), 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-4 text-white">
      <div className="w-full max-w-md rounded-lg border border-[#1e1e2e] bg-[#111118] p-6">
        <h1 className="text-xl font-semibold">Accept Team Invitation</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Sign in to your account and accept the invitation to join this organization.
        </p>

        {error && (
          <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={acceptInvite}
            disabled={loading || !token}
            className="rounded bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Accepting…" : "Accept Invitation"}
          </button>
          <Link
            href="/auth/login"
            className="text-center text-sm text-[#9ca3af] hover:text-white"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
