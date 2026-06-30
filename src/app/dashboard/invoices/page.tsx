"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { USDT_NETWORKS, getNetworkLabel, type UsdtNetwork } from "@/lib/constants";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerEmail: string;
  customerName: string | null;
  total: string;
  currency: string;
  status: string;
  createdAt: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USDT");
  const [usdtNetwork, setUsdtNetwork] = useState<UsdtNetwork>("TRC20");
  const [loading, setLoading] = useState(false);
  const [lastLink, setLastLink] = useState("");

  const load = () => {
    fetch("/api/invoices").then((r) => r.json()).then(setInvoices).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_email: customerEmail,
        customer_name: customerName || undefined,
        currency,
        network: currency === "USDT" ? usdtNetwork : undefined,
        items: [{ description: description || "Invoice item", quantity: 1, unit_price: Number(amount) }],
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setLastLink(data.payment_link);
      setShowCreate(false);
      load();
    }
  };

  return (
    <>
      <DashboardHeader title="Invoices" subtitle={`${invoices.length} invoices`}>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-1.5">
          <Icon name="Plus" className="h-3 w-3" />
          New invoice
        </button>
      </DashboardHeader>
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {showCreate && (
          <div className="card mb-4 space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Customer email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input" />
              <input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
            </div>
            <input placeholder="Item description" value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="BTC">BTC</option>
              </select>
            </div>
            {currency === "USDT" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {USDT_NETWORKS.map((n) => (
                  <button
                    key={n.network}
                    type="button"
                    onClick={() => setUsdtNetwork(n.network)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs ${
                      usdtNetwork === n.network
                        ? "border-[#7c3aed] bg-[#7c3aed18] text-white"
                        : "border-drift-border text-drift-muted"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            )}
            {currency === "USDT" && (
              <p className="text-2xs text-drift-muted">Network: {getNetworkLabel("USDT", usdtNetwork)}</p>
            )}
            <button onClick={handleCreate} disabled={loading} className="btn-primary">Create invoice</button>
            {lastLink && <p className="text-xs text-drift-green">Payment link: <Link href={lastLink} className="underline">{lastLink}</Link></p>}
          </div>
        )}
        <div className="card overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-drift-border text-drift-muted">
              <tr>
                <th className="px-4 py-2">Invoice #</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-drift-border/50">
                  <td className="px-4 py-2.5 font-mono text-white">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5">{inv.customerName ?? inv.customerEmail}</td>
                  <td className="px-4 py-2.5 tabular-nums">{inv.total} {inv.currency}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={inv.status === "paid" ? "Completed" : "Pending"} /></td>
                  <td className="px-4 py-2.5 text-drift-muted">{new Date(inv.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
