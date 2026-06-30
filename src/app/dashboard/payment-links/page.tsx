"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { DashboardHeader } from "@/components/dashboard/header";
import { CryptoIcon } from "@/components/crypto-icon";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { USDT_NETWORKS, getNetworkLabel, type UsdtNetwork } from "@/lib/constants";

const CURRENCIES = ["USDT", "BTC", "USDC", "ETH", "SOL"];
const EXPIRY_OPTIONS: Record<string, number | null> = {
  "1 day": 1,
  "7 days": 7,
  "14 days": 14,
  "30 days": 30,
  Never: null,
};

interface PaymentLinkRow {
  id: string;
  title: string;
  shortCode: string;
  amount: string;
  currency: string;
  network: string;
  status: string;
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
  const [usdtNetwork, setUsdtNetwork] = useState<UsdtNetwork>("TRC20");
  const [walletId, setWalletId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [expiryOn, setExpiryOn] = useState(false);
  const [expiry, setExpiry] = useState("7 days");
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState<PaymentLinkRow[]>([]);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState<PaymentLinkRow | null>(null);

  const loadLinks = () => {
    fetch("/api/payment-links")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLinks)
      .catch(() => {});
  };

  useEffect(() => {
    loadLinks();
    fetch("/api/wallets")
      .then((r) => (r.ok ? r.json() : { wallets: [] }))
      .then((d) => setWallets(d.wallets ?? []))
      .catch(() => {});
  }, []);

  const walletsForCurrency = useMemo(() => {
    if (currency === "USDT") {
      return wallets.filter((w) => w.currency === "USDT" && w.network === usdtNetwork);
    }
    return wallets.filter((w) => w.currency === currency);
  }, [wallets, currency, usdtNetwork]);

  useEffect(() => {
    if (walletsForCurrency.length > 0 && !walletsForCurrency.find((w) => w.id === walletId)) {
      setWalletId(walletsForCurrency[0].id);
    } else if (walletsForCurrency.length === 0) {
      setWalletId("");
    }
  }, [walletsForCurrency, walletId]);

  const selectedWallet = wallets.find((w) => w.id === walletId);
  const previewLink = createdLink
    ? `/pay/${createdLink.shortCode}`
    : amount
      ? `drift.to/pay/preview`
      : "drift.to/pay/...";

  const copyLink = () => {
    const url = createdLink
      ? `${window.location.origin}/pay/${createdLink.shortCode}`
      : `https://${previewLink}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    if (!walletId) {
      const networkHint = currency === "USDT" ? ` on ${getNetworkLabel("USDT", usdtNetwork)}` : "";
      setError(`Create a ${currency} wallet${networkHint} in Wallets first`);
      return;
    }
    setLoading(true);
    setError("");

    let expiryIso: string | undefined;
    if (expiryOn && EXPIRY_OPTIONS[expiry]) {
      const d = new Date();
      d.setDate(d.getDate() + (EXPIRY_OPTIONS[expiry] ?? 0));
      expiryIso = d.toISOString();
    }

    const res = await fetch("/api/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: name,
        description: description || undefined,
        amount: Number(amount),
        currency,
        network: currency === "USDT" ? usdtNetwork : selectedWallet?.network,
        wallet_id: walletId,
        redirect_url: redirectUrl || undefined,
        expiry: expiryIso,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create link");
      return;
    }

    setCreatedLink(data);
    setName("");
    setDescription("");
    setAmount("");
    loadLinks();
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
    if (createdLink?.id === id) setCreatedLink(null);
    loadLinks();
  };

  return (
    <>
      <DashboardHeader
        title="Create Payment Link"
        subtitle="Create a link and start accepting payments in minutes."
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_400px]">
          <div className="card-elevated p-6">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">Product / Service Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Premium Membership"
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">
                  Description <span className="text-drift-muted">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">Amount</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="120.00"
                    className="flex-1 rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white focus:border-[#7c3aed] focus:outline-none"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCurrencyOpen((v) => !v)}
                      className="flex w-[120px] items-center gap-2 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5 text-[14px] text-white"
                    >
                      <CryptoIcon symbol={currency} size="xs" />
                      <span className="flex-1 text-left">{currency}</span>
                      <Icon name="ChevronDown" className="h-4 w-4 text-drift-muted" />
                    </button>
                    {currencyOpen && (
                      <div className="absolute right-0 z-10 mt-1 w-[120px] overflow-hidden rounded-lg border border-drift-border bg-drift-card py-1 shadow-lg">
                        {CURRENCIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCurrency(c);
                              setCurrencyOpen(false);
                              if (c === "USDT") setUsdtNetwork("TRC20");
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-white hover:bg-white/5"
                          >
                            <CryptoIcon symbol={c} size="xs" />
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currency === "USDT" && (
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-white">USDT Network</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {USDT_NETWORKS.map((n) => (
                      <button
                        key={n.network}
                        type="button"
                        onClick={() => setUsdtNetwork(n.network)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                          usdtNetwork === n.network
                            ? "border-[#7c3aed] bg-[#7c3aed18] text-white"
                            : "border-drift-border bg-drift-bg text-drift-muted hover:border-[#3f3f50]"
                        )}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">Receive to wallet</label>
                {walletsForCurrency.length === 0 ? (
                  <p className="text-sm text-red-400">
                    No {currency}
                    {currency === "USDT" ? ` (${getNetworkLabel("USDT", usdtNetwork)})` : ""} wallet yet.{" "}
                    <Link href="/dashboard/wallets" className="text-brand-400 hover:underline">
                      Add one in Wallets
                    </Link>
                  </p>
                ) : (
                  <select
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white focus:border-[#7c3aed] focus:outline-none"
                  >
                    {walletsForCurrency.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label ?? getNetworkLabel(w.currency, w.network)} —{" "}
                        {w.walletType === "generated" ? "Drift custodial" : "Connected"} (
                        {w.address.slice(0, 8)}…)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-white">
                    Set Expiry <span className="text-drift-muted">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpiryOn((v) => !v)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      expiryOn ? "bg-[#7c3aed]" : "bg-[#2a2a38]"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                        expiryOn ? "translate-x-[22px]" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
                {expiryOn && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setExpiryOpen((v) => !v)}
                      className="flex w-full items-center justify-between rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white"
                    >
                      {expiry}
                      <Icon name="ChevronDown" className="h-4 w-4 text-drift-muted" />
                    </button>
                    {expiryOpen && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-drift-border bg-drift-card py-1 shadow-lg">
                        {Object.keys(EXPIRY_OPTIONS).map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => {
                              setExpiry(o);
                              setExpiryOpen(false);
                            }}
                            className="flex w-full px-3.5 py-2 text-[13px] text-white hover:bg-white/5"
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-white">
                  Redirect URL <span className="text-drift-muted">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://yoursite.com/success"
                  className="w-full rounded-lg border border-drift-border bg-drift-bg px-3.5 py-2.5 text-[14px] text-white placeholder:text-drift-muted focus:border-[#7c3aed] focus:outline-none"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || !name || !amount || !walletId}
                className="w-full rounded-lg bg-[#7c3aed] py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create Link"}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-white">Preview</p>
            <div className="card-elevated p-6 text-center">
              <h3 className="text-[18px] font-bold text-white">{name || createdLink?.title || "Product Name"}</h3>
              {description && (
                <p className="mx-auto mt-1.5 max-w-[240px] text-[13px] leading-snug text-drift-muted">
                  {description}
                </p>
              )}
              <p className="mt-5 text-2xl font-bold tabular-nums text-white">
                {amount || createdLink?.amount || "0.00"} {currency}
                {currency === "USDT" && (
                  <span className="ml-2 text-base font-medium text-drift-muted">
                    {getNetworkLabel("USDT", usdtNetwork)}
                  </span>
                )}
              </p>
              <div className="mx-auto mt-5 flex w-[200px] items-center justify-center rounded-2xl bg-white p-4">
                <QRCodeSVG
                  value={
                    createdLink
                      ? `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${createdLink.shortCode}`
                      : selectedWallet?.address ?? previewLink
                  }
                  size={168}
                />
              </div>
              <div className="mt-5 rounded-lg border border-drift-border bg-drift-bg px-3 py-2.5 text-[13px] text-white">
                {createdLink ? `/pay/${createdLink.shortCode}` : previewLink}
              </div>
              <button
                onClick={copyLink}
                disabled={!createdLink}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-drift-border bg-drift-card py-2.5 text-[13px] font-medium text-white hover:bg-white/5 disabled:opacity-50"
              >
                <Icon name={copied ? "Check" : "Copy"} className="h-4 w-4" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>

        <div className="card-elevated mt-6 overflow-hidden">
          <div className="border-b border-drift-border px-5 py-4">
            <h2 className="text-[15px] font-semibold text-white">Your Payment Links</h2>
            <p className="text-[12px] text-drift-muted">{links.length} links</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-drift-border text-[12px] text-drift-muted">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Network</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Link</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-drift-border/60 last:border-0">
                    <td className="px-5 py-4 text-white">{link.title}</td>
                    <td className="px-5 py-4 tabular-nums text-white">
                      {link.amount} {link.currency}
                    </td>
                    <td className="px-5 py-4 text-drift-muted">
                      {getNetworkLabel(link.currency, link.network)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          link.status === "paid"
                            ? "Completed"
                            : link.status === "active"
                              ? "Pending"
                              : "Failed"
                        }
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/pay/${link.shortCode}`} className="text-brand-400 hover:underline">
                        /pay/{link.shortCode}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {link.status === "active" && (
                        <button
                          onClick={() => deactivate(link.id)}
                          className="text-[12px] text-red-400 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-drift-muted">
                      No payment links yet. Create your first link above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
