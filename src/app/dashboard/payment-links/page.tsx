"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";

interface PaymentLinkRow {
  id: string;
  title: string;
  shortCode: string;
  amount: string;
  currency: string;
  status: string;
  depositAddress: string;
  createdAt: string;
}

export default function PaymentLinksPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiry, setExpiry] = useState("");
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadLinks = () => {
    fetch("/api/payment-links")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  };

  useEffect(() => { loadLinks(); }, []);

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description: description || undefined,
        amount: Number(amount),
        currency,
        redirect_url: redirectUrl || undefined,
        expiry: expiry ? new Date(expiry).toISOString() : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) return;
    setShowCreate(false);
    setName("");
    setDescription("");
    setAmount("");
    loadLinks();
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
    loadLinks();
  };

  return (
    <>
      <DashboardHeader title="Payment links" subtitle={`${links.length} links`}>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5">
          <Icon name="Plus" className="h-3 w-3" />
          New link
        </button>
      </DashboardHeader>
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {showCreate && (
          <div className="card mb-4 p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="section-label mb-1 block">Product name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input w-full resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label mb-1 block">Amount</label>
                    <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
                  </div>
                  <div>
                    <label className="section-label mb-1 block">Currency</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input w-full">
                      <option value="USDT">USDT</option>
                      <option value="BTC">BTC</option>
                      <option value="USDC">USDC</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="section-label mb-1 block">Expiry (optional)</label>
                  <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Redirect URL (optional)</label>
                  <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} className="input w-full" placeholder="https://yoursite.com/success" />
                </div>
                <button onClick={handleCreate} disabled={loading || !name || !amount} className="btn-primary w-full py-2">
                  {loading ? "Creating…" : "Create link"}
                </button>
              </div>
              <div className="flex items-center justify-center border border-drift-border bg-white p-4">
                <QRCodeSVG value={amount ? `${amount} ${currency}` : "drift"} size={140} />
              </div>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Link</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b border-drift-border/50 hover:bg-drift-hover/30">
                  <td className="px-4 py-2.5 text-white">{link.title}</td>
                  <td className="px-4 py-2.5 tabular-nums">{link.amount} {link.currency}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={link.status === "paid" ? "Completed" : link.status === "active" ? "Pending" : "Failed"} />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/pay/${link.shortCode}`} className="text-drift-purple hover:underline">
                      /pay/{link.shortCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {link.status === "active" && (
                      <button onClick={() => deactivate(link.id)} className="text-2xs text-drift-red hover:underline">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-drift-muted">
                    No payment links yet. Create your first link above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
