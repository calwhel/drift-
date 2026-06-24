import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function tableExists(name: string): Promise<boolean> {
  try {
    await db.execute(sql.raw(`SELECT 1 FROM "${name}" LIMIT 1`));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const checks: Record<string, string> = {
    database_url: process.env.DATABASE_URL ? "set" : "missing",
    nextauth_secret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    nextauth_url: process.env.NEXTAUTH_URL ? "set" : "missing",
    wallet_encryption_key:
      process.env.WALLET_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET ? "set" : "missing",
    cron_secret: process.env.CRON_SECRET ? "set" : "missing",
    trongrid_api_key: process.env.TRONGRID_API_KEY ? "set" : "missing",
    etherscan_api_key: process.env.ETHERSCAN_API_KEY ? "set" : "missing",
  };
  const requiredChecks = [
    "database_url",
    "nextauth_secret",
    "nextauth_url",
    "wallet_encryption_key",
    "cron_secret",
  ] as const;

  const body: Record<string, unknown> = {
    ok: false,
    alive: true,
    checks,
  };

  const missingRequired = requiredChecks.filter((key) => checks[key] !== "set");
  if (missingRequired.length > 0) {
    body.error = `Missing required env vars: ${missingRequired.join(", ")}`;
    return NextResponse.json(body, { status: 503 });
  }

  try {
    await db.execute(sql`SELECT 1`);

    const requiredTables = [
      "users",
      "wallets",
      "payment_links",
      "transactions",
      "subscriptions",
      "webhooks",
      "api_keys",
      "organization_members",
      "organizations",
      "team_invitations",
    ];
    const missing: string[] = [];
    for (const table of requiredTables) {
      const exists = await tableExists(table);
      if (!exists) missing.push(table);
    }

    if (missing.length > 0) {
      body.missing = missing;
      body.error = `Database tables missing: ${missing.join(", ")}`;
      return NextResponse.json(body, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      alive: true,
      checks,
      message: "All systems operational",
    });
  } catch (err) {
    body.error = err instanceof Error ? err.message : "Database connection failed";
    return NextResponse.json(body, { status: 503 });
  }
}
