import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, wallets, organizations, organizationMembers } from "@/lib/db";
import { NETWORKS } from "@/lib/constants";
import { deriveDepositAddress, getNextDerivationIndex } from "@/lib/wallet/derive";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
});

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return base || "business";
}

function formatError(err: unknown): string {
  if (err instanceof z.ZodError) return "Invalid input";
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("database_url")) return "Server misconfigured: database not connected";
    if (msg.includes("relation") && msg.includes("does not exist")) {
      return "Database not set up. Run npm run db:push against your Neon database.";
    }
    if (msg.includes("connect") || msg.includes("econnrefused")) {
      return "Cannot connect to database. Check DATABASE_URL.";
    }
    if (process.env.NODE_ENV === "development") return err.message;
  }
  return "Registration failed";
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Server misconfigured: DATABASE_URL is not set" },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit(`register:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash,
        businessName: data.businessName,
      })
      .returning();

    // Organization setup — non-fatal if schema partially migrated
    try {
      const slug = `${slugify(data.businessName)}-${user.id.slice(0, 6)}`;
      const [org] = await db
        .insert(organizations)
        .values({
          name: data.businessName,
          slug,
          ownerId: user.id,
        })
        .returning();

      await db
        .update(users)
        .set({ organizationId: org.id })
        .where(eq(users.id, user.id));

      await db.insert(organizationMembers).values({
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      });
    } catch (orgErr) {
      console.error("Org setup failed (non-fatal):", orgErr);
    }

    const defaultCurrencies = ["USDT", "BTC", "USDC"] as const;
    for (const currency of defaultCurrencies) {
      const cfg = NETWORKS[currency];
      let address: string;
      try {
        const idx = await getNextDerivationIndex();
        address = deriveDepositAddress(idx, currency, cfg.network);
      } catch {
        address = `pending_${currency.toLowerCase()}_${user.id.slice(0, 8)}`;
      }

      await db.insert(wallets).values({
        userId: user.id,
        currency,
        network: cfg.network,
        address,
        balance: "0",
      });
    }

    try {
      await logAudit(user.id, "user.registered", "user", user.id);
    } catch {
      // audit_logs table may not exist yet
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((i) => i.message).join(". ");
      return NextResponse.json({ error: message || "Invalid input" }, { status: 400 });
    }
    console.error("Registration error:", err);
    return NextResponse.json({ error: formatError(err) }, { status: 500 });
  }
}
