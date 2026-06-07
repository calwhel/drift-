import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, wallets } from "@/lib/db";
import { NETWORKS } from "@/lib/constants";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
});

export async function POST(req: Request) {
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

    const defaultCurrencies = ["USDT", "BTC", "USDC"] as const;
    for (const currency of defaultCurrencies) {
      const cfg = NETWORKS[currency];
      await db.insert(wallets).values({
        userId: user.id,
        currency,
        network: cfg.network,
        address: `pending_${currency.toLowerCase()}_${user.id.slice(0, 8)}`,
        balance: "0",
      });
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
