import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getTelegramConfigStatus } from "@/lib/telegram";
import { isMasterWalletConfigured } from "@/lib/wallet/master-wallet";
import { getTronGasWalletStatus } from "@/lib/wallet/gas-wallet";
import { getSplGasWalletStatus } from "@/lib/wallet/spl-gas";
import { getAllEvmGasWalletStatuses } from "@/lib/evm/gas";

const CRITICAL_TABLES = [
  "users",
  "wallets",
  "payment_links",
  "transactions",
  "withdrawals",
  "settlements",
  "derivation_counter",
  "gas_wallets",
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
    nextauth_url: process.env.NEXTAUTH_URL ? "set" : "missing",
    telegram_bot_token: telegram.bot_token,
    telegram_admin_chat_id: telegram.admin_chat_id,
    etherscan_api_key: process.env.ETHERSCAN_API_KEY ? "set" : "missing",
    trongrid_api_key: process.env.TRONGRID_API_KEY ? "set" : "missing",
    solana_rpc_url: process.env.SOLANA_RPC_URL ? "set" : "default",
    cron_secret: process.env.CRON_SECRET ? "set" : "missing",
    email_provider: process.env.RESEND_API_KEY ? "set" : "missing",
    master_wallet_mnemonic: isMasterWalletConfigured() ? "set" : "missing",
    payment_poller: "in-process (60s)",
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
      body.evm_gas_wallets = evmGas.map((g) => ({
        network: g.network,
        ready: g.ready,
        nativeSymbol: g.nativeSymbol,
        nativeBalance: g.nativeBalance,
        address: g.address,
      }));
      const evmReady = evmGas.every((g) => g.ready);
      checks.evm_gas_wallets = evmReady ? "ready" : "needs_funding";
    } catch {
      checks.evm_gas_wallets = "unknown";
    }

    if (!isMasterWalletConfigured()) {
      body.warning = "MASTER_WALLET_MNEMONIC not set — unique deposit addresses disabled";
    }

    if (!process.env.ETHERSCAN_API_KEY) {
      body.warning =
        (body.warning ? `${body.warning}; ` : "") +
        "ETHERSCAN_API_KEY missing — EVM USDT payments will not be detected";
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
