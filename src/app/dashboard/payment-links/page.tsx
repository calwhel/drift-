"use client";

import { useState, useEffect, useMemo } from "react";
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

interface WalletOption {
  id: string;
  currency: string;
  network: string;
  address: string;
  walletType: string;
  label: string | null;
}

export default function PaymentLinksPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [walletId, setWalletId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiry, setExpiry] = useState("");
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const loadLinks = () => {
    fetch("/api/payment-links")
      .then((r) => r.json())
      .then(setLinks)
      .catch(() => {});
  };

  useEffect(() => {
    loadLinks();
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => setWallets(d.wallets ?? []))
      .catch(() => {});
  }, []);

  const walletsForCurrency = useMemo(
    () => wallets.filter((w) => w.currency === currency),
    [wallets, currency]
  );

  useEffect(() => {
    if (walletsForCurrency.length > 0 && !walletsForCurrency.find((w) => w.id === walletId)) {
      setWalletId(walletsForCurrency[0].id);
    } else if (walletsForCurrency.length === 0) {
      setWalletId("");
    }
  }, [walletsForCurrency, walletId]);

  const selectedWallet = wallets.find((w) => w.id === walletId);

  const handleCreate = async () => {
    if (!walletId) {
      setError("Create a wallet for this currency in Wallets first");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description: description || undefined,
        amount: Number(amount),
        currency,
        wallet_id: walletId,
        redirect_url: redirectUrl || undefined,
        expiry: expiry ? new Date(expiry).toISOString() : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create link");
      return;
    }
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
            {error && (
              <p className="mb-3 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-xs text-drift-red">
                {error}
              </p>
            )}
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
                      <option value="SOL">SOL</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="section-label mb-1 block">Receive to wallet</label>
                  {walletsForCurrency.length === 0 ? (
                    <p className="text-xs text-drift-red">
                      No {currency} wallet yet.{" "}
                      <Link href="/dashboard/wallets" className="text-drift-purple hover:underline">
                        Add one in Wallets
                      </Link>
                    </p>
                  ) : (
                    <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="input w-full">
                      {walletsForCurrency.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label ?? w.currency} — {w.walletType === "generated" ? "Drift custodial" : "Connected"} (
                          {w.address.slice(0, 8)}…)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="section-label mb-1 block">Expiry (optional)</label>
                  <input type="datetime-local" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input w-full" />
                </div>
                <div>
                  <label className="section-label mb-1 block">Redirect URL (optional)</label>
                  <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} className="input w-full" placeholder="https://yoursite.com/success" />
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading || !name || !amount || !walletId}
                  className="btn-primary w-full py-2"
                >
                  {loading ? "Creating…" : "Create link"}
                </button>
              </div>
              <div className="flex flex-col items-center justify-center border border-drift-border bg-white p-4">
                {selectedWallet ? (
                  <>
                    <QRCodeSVG value={selectedWallet.address} size={140} />
                    <p className="mt-2 text-center text-2xs text-gray-600">
                      Payments go to your selected wallet
                    </p>
                  </>
                ) : (
                  <QRCodeSVG value={amount ? `${amount} ${currency}` : "drift"} size={140} />
                )}
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
