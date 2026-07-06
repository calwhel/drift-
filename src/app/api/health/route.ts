import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getTelegramConfigStatus } from "@/lib/telegram";
import { isMasterWalletConfigured } from "@/lib/wallet/master-wallet";
import { getTronGasWalletStatus } from "@/lib/wallet/gas-wallet";

async function tableExists(name: string): Promise<boolean> {
  try {
    await db.execute(sql.raw(`SELECT 1 FROM "${name}" LIMIT 1`));
    return true;
  } catch {
    return false;
  }
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
    return NextResponse.json(body, { status: 200 });
  }

  if (!process.env.NEXTAUTH_SECRET) {
    body.error = "NEXTAUTH_SECRET is not configured";
    return NextResponse.json(body, { status: 200 });
  }

  try {
    await db.execute(sql`SELECT 1`);

    const usersOk = await tableExists("users");
    const walletsOk = await tableExists("wallets");

    const missing: string[] = [];
    if (!usersOk) missing.push("users");
    if (!walletsOk) missing.push("wallets");

    if (missing.length > 0) {
      body.missing = missing;
      body.error = `Database tables missing: ${missing.join(", ")}`;
      return NextResponse.json(body, { status: 200 });
    }

    try {
      const gas = await getTronGasWalletStatus();
      checks.tron_gas_wallet = gas.ready ? "ready" : gas.configured ? "needs_trx" : "not_configured";
    } catch {
      checks.tron_gas_wallet = "unknown";
    }

    return NextResponse.json({
      ok: true,
      alive: true,
      checks,
      message: "All systems operational",
    });
  } catch (err) {
    body.error = err instanceof Error ? err.message : "Database connection failed";
    return NextResponse.json(body, { status: 200 });
  }
}
