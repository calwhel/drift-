import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getTelegramConfigStatus } from "@/lib/telegram";
import { isMasterWalletConfigured } from "@/lib/wallet/master-wallet";
import { getTronGasWalletStatus } from "@/lib/wallet/gas-wallet";
import { getSplGasWalletStatus } from "@/lib/wallet/spl-gas";
import { getAllEvmGasWalletStatuses } from "@/lib/evm/gas";
import { getPollHealthSnapshot, isPollDegraded } from "@/lib/blockchain/poll-health";

const CRITICAL_TABLES = [
  "users",
  "wallets",
  "payment_links",
  "transactions",
  "withdrawals",
  "settlements",
  "derivation_counter",
  "gas_wallets",
  "poller_lease",
  "rate_limit_buckets",
];

async function tableExists(name: string): Promise<boolean> {
  try {
    await db.execute(sql.raw(`SELECT 1 FROM "${name}" LIMIT 1`));
    return true;
  } catch {
    return false;
  }
}

function unhealthy(body: Record<string, unknown>) {
  return NextResponse.json(body, { status: 503 });
}

export async function GET() {
  const telegram = getTelegramConfigStatus();
  const checks: Record<string, string> = {
    database_url: process.env.DATABASE_URL ? "set" : "missing",
    nextauth_secret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    wallet_encryption_key: process.env.WALLET_ENCRYPTION_KEY ? "set" : "missing",
    master_wallet_mnemonic: isMasterWalletConfigured() ? "set" : "missing",
    etherscan_api_key: process.env.ETHERSCAN_API_KEY ? "set" : "missing",
    payment_poller: "in-process (60s)",
    telegram: telegram.bot_token === "set" ? "configured" : "optional",
  };

  const body: Record<string, unknown> = {
    ok: false,
    alive: true,
    checks,
  };

  if (!process.env.DATABASE_URL) {
    body.error = "DATABASE_URL is not configured";
    return unhealthy(body);
  }

  if (!process.env.NEXTAUTH_SECRET) {
    body.error = "NEXTAUTH_SECRET is not configured";
    return unhealthy(body);
  }

  if (!isMasterWalletConfigured()) {
    body.error = "MASTER_WALLET_MNEMONIC is not configured — payment links cannot be created safely";
    return unhealthy(body);
  }

  try {
    await db.execute(sql`SELECT 1`);

    const missing: string[] = [];
    for (const table of CRITICAL_TABLES) {
      const exists = await tableExists(table);
      if (!exists) missing.push(table);
    }

    if (missing.length > 0) {
      body.missing = missing;
      body.error = `Database tables missing: ${missing.join(", ")}`;
      return unhealthy(body);
    }

    try {
      const gas = await getTronGasWalletStatus();
      checks.tron_gas_wallet = gas.ready ? "ready" : gas.configured ? "needs_trx" : "not_configured";
    } catch {
      checks.tron_gas_wallet = "unknown";
    }

    try {
      const splGas = await getSplGasWalletStatus();
      checks.solana_gas_wallet = splGas.ready ? "ready" : splGas.configured ? "needs_sol" : "not_configured";
    } catch {
      checks.solana_gas_wallet = "unknown";
    }

    try {
      const evmGas = await getAllEvmGasWalletStatuses();
      checks.evm_gas_wallets = evmGas.every((g) => g.ready) ? "ready" : "needs_funding";
    } catch {
      checks.evm_gas_wallets = "unknown";
    }

    const pollHealth = getPollHealthSnapshot();
    if (pollHealth.length > 0) {
      body.poll_health = pollHealth.map((h) => ({
        network: h.network,
        failures: h.failures,
        lastError: h.lastError,
      }));
    }

    if (isPollDegraded()) {
      body.error = "Payment detection is degraded — blockchain API failures detected";
      return unhealthy(body);
    }

    if (!process.env.ETHERSCAN_API_KEY) {
      body.warning =
        (body.warning ? `${body.warning}; ` : "") +
        "ETHERSCAN_API_KEY not set — optional fallback for EVM detection (RPC is primary)";
    }

    if (!process.env.WALLET_ENCRYPTION_KEY) {
      body.warning = "WALLET_ENCRYPTION_KEY not set — using NEXTAUTH_SECRET fallback for wallet encryption";
    }

    return NextResponse.json({
      ok: true,
      alive: true,
      checks,
      message: "All systems operational",
    });
  } catch (err) {
    body.error = err instanceof Error ? err.message : "Database connection failed";
    return unhealthy(body);
  }
}
