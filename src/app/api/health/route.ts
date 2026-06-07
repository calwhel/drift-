import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function tableExists(name: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql.raw(`SELECT 1 FROM "${name}" LIMIT 1`)
    );
    return result !== undefined;
  } catch {
    return false;
  }
}

export async function GET() {
  const checks: Record<string, string> = {
    database_url: process.env.DATABASE_URL ? "set" : "missing",
    nextauth_secret: process.env.NEXTAUTH_SECRET ? "set" : "missing",
    nextauth_url: process.env.NEXTAUTH_URL ? "set" : "missing",
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, checks, error: "DATABASE_URL is not configured on the server" },
      { status: 503 }
    );
  }

  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      { ok: false, checks, error: "NEXTAUTH_SECRET is not configured on the server" },
      { status: 503 }
    );
  }

  try {
    await db.execute(sql`SELECT 1`);

    const usersOk = await tableExists("users");
    const walletsOk = await tableExists("wallets");
    const orgsOk = await tableExists("organizations");

    const missing: string[] = [];
    if (!usersOk) missing.push("users");
    if (!walletsOk) missing.push("wallets");
    if (!orgsOk) missing.push("organizations");

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          checks,
          missing,
          error: `Database tables missing: ${missing.join(", ")}. Run npm run db:push`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      checks,
      message: "All systems operational",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        checks,
        error: err instanceof Error ? err.message : "Database connection failed",
      },
      { status: 503 }
    );
  }
}
