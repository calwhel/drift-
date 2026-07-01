import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getTelegramConfigStatus } from "@/lib/telegram";

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
