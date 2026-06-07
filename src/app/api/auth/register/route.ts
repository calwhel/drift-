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
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const limit = rateLimit(`register:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

    await logAudit(user.id, "user.registered", "user", user.id, undefined, org.id);

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
