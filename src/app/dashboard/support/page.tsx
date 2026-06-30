"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");

      setSuccess("Your message was sent. Our team will get back to you by email.");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DashboardHeader
        title="Help & Contact"
        subtitle="Get help with payments, wallets, or your account"
      />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="card flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed29] text-[#c4b5fd]">
              <Icon name="Headphones" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-white">Need help?</p>
              <p className="mt-1 text-2xs leading-relaxed text-drift-muted">
                Describe your issue below and we will notify our support team. You can also reach us at{" "}
                <a href="mailto:support@driftpayment.io" className="text-brand-400 hover:underline">
                  support@driftpayment.io
                </a>
                .
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
              {success}
            </p>
          )}

          <form onSubmit={handleSubmit} className="card space-y-4 p-4">
            <div>
              <label className="section-label mb-1 block">Subject (optional)</label>
              <input
                className="input w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Payment not detected"
                maxLength={200}
              />
            </div>
            <div>
              <label className="section-label mb-1 block">Message</label>
              <textarea
                className="input min-h-[160px] w-full resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you need help with…"
                required
                minLength={10}
                maxLength={4000}
              />
              <p className="mt-1 text-2xs text-drift-muted">{message.length}/4000</p>
            </div>
            <button type="submit" disabled={loading || message.trim().length < 10} className="btn-primary w-full py-2">
              {loading ? "Sending…" : "Send Message"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
