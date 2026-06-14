"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { WalletBalanceChart } from "@/components/dashboard/wallet-balance-chart";
import { CryptoIcon } from "@/components/crypto-icon";
import { MERCHANT_WALLET_NETWORKS } from "@/lib/constants";

interface WalletRow {
  id: string;
  currency: string;
  network: string;
  address: string;
  balance: string;
  walletType: string;
  label: string | null;
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [connectAddress, setConnectAddress] = useState<Record<string, string>>({});
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const [withdrawWalletId, setWithdrawWalletId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((d) => {
        setWallets(d.wallets ?? []);
        setTotalBalance(d.totalBalance ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const walletForNetwork = (currency: string, network: string) =>
    wallets.find((w) => w.currency === currency && w.network === network);

  const connectWallet = async (currency: string, network: string) => {
    const key = `${currency}|${network}`;
    const address = connectAddress[key]?.trim();
    if (!address) {
      setError("Enter a wallet address");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "connected", currency, network, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to connect wallet");
      setSuccess(`${currency} wallet connected`);
      setActiveNetwork(null);
      setConnectAddress((prev) => ({ ...prev, [key]: "" }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const generateWallet = async (currency: string, network: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generated", currency, network }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate wallet");
      setSuccess(`Drift generated a new ${currency} wallet — save your deposit address`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawWalletId) return;
    setWithdrawLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_id: withdrawWalletId,
          amount: Number(withdrawAmount),
          to_address: withdrawAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");
      setSuccess("Withdrawal submitted — funds will be sent on-chain");
      setWithdrawWalletId(null);
      setWithdrawAmount("");
      setWithdrawAddress("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setSuccess("Address copied");
  };

  return (
    <>
      <DashboardHeader title="Wallets" subtitle="Connect your own or use Drift-generated custodial wallets" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-5">
        {error && (
          <p className="mb-4 rounded border border-drift-red/30 bg-drift-red/10 px-3 py-2 text-sm text-drift-red">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 rounded border border-drift-green/30 bg-drift-green/10 px-3 py-2 text-sm text-drift-green">
            {success}
          </p>
        )}

        <div className="card mb-4 p-4">
          <p className="section-label">Total balance</p>
          <p className="text-xl font-semibold tabular-nums text-white">
            ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4">
            <WalletBalanceChart />
          </div>
        </div>

        <h2 className="section-title mb-3">Networks</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {MERCHANT_WALLET_NETWORKS.map((net) => {
            const wallet = walletForNetwork(net.currency, net.network);
            const key = `${net.currency}|${net.network}`;
            const isConnecting = activeNetwork === key;

            return (
              <div key={key} className="card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CryptoIcon symbol={net.currency} size="md" />
                  <div>
                    <p className="font-medium text-white">{net.label}</p>
                    <p className="text-2xs text-drift-muted">{net.network}</p>
                  </div>
                </div>

                {wallet ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-2xs ${
                          wallet.walletType === "generated"
                            ? "bg-drift-purple/20 text-drift-purple"
                            : "bg-drift-hover text-drift-muted"
                        }`}
                      >
                        {wallet.walletType === "generated" ? "Drift custodial" : "Connected"}
                      </span>
                      <span className="text-xs text-white tabular-nums">
                        {Number(wallet.balance).toFixed(4)} {wallet.currency}
                      </span>
                    </div>
                    <div className="rounded border border-drift-border bg-drift-bg p-2">
                      <p className="break-all font-mono text-2xs text-drift-muted">{wallet.address}</p>
                      <button
                        type="button"
                        onClick={() => copyAddress(wallet.address)}
                        className="mt-2 text-2xs text-drift-purple hover:underline"
                      >
                        Copy address
                      </button>
                    </div>
                    {wallet.walletType === "generated" && (
                      <button
                        type="button"
                        onClick={() => setWithdrawWalletId(wallet.id)}
                        className="btn-primary w-full"
                        disabled={Number(wallet.balance) <= 0}
                      >
                        Withdraw to external address
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-drift-muted">
                      Connect your existing wallet or let Drift generate a custodial wallet for this network.
                    </p>
                    {!isConnecting ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setActiveNetwork(key)}
                          className="btn-secondary flex-1"
                          disabled={loading}
                        >
                          Connect own wallet
                        </button>
                        <button
                          type="button"
                          onClick={() => generateWallet(net.currency, net.network)}
                          className="btn-primary flex-1"
                          disabled={loading}
                        >
                          Generate wallet
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={connectAddress[key] ?? ""}
                          onChange={(e) =>
                            setConnectAddress((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder="Paste your wallet address"
                          className="input w-full font-mono text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveNetwork(null)}
                            className="btn-secondary flex-1"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => connectWallet(net.currency, net.network)}
                            className="btn-primary flex-1"
                            disabled={loading}
                          >
                            Save address
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {withdrawWalletId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card w-full max-w-md p-5">
              <h3 className="section-title mb-3">Withdraw funds</h3>
              <p className="mb-4 text-xs text-drift-muted">
                Send from your Drift custodial wallet to any external address.
              </p>
              <form onSubmit={handleWithdraw} className="space-y-3">
                <div>
                  <label className="section-label mb-1 block">Amount</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input w-full"
                    required
                    disabled={withdrawLoading}
                  />
                </div>
                <div>
                  <label className="section-label mb-1 block">Destination address</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="input w-full font-mono text-xs"
                    required
                    disabled={withdrawLoading}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawWalletId(null)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={withdrawLoading} className="btn-primary flex-1">
                    {withdrawLoading ? "Submitting…" : "Withdraw"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
