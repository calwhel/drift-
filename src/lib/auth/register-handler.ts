import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { notifyNewSignup } from "@/lib/telegram";
import { ensureOrganizationForUser } from "@/lib/org";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
});

function formatError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => i.message).join(". ");
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes("DATABASE_URL")) return "Server misconfigured: database not connected";
    if (msg.includes("does not exist")) {
      return "Database tables missing. Migrations may not have run — contact support or retry deploy.";
    }
    if (msg.includes("connect") || msg.includes("ECONNREFUSED")) {
      return "Cannot connect to database. Check DATABASE_URL.";
    }
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return "Email already registered";
    }
    return msg;
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
    const email = data.email.toLowerCase().trim();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        businessName: data.businessName.trim(),
      })
      .returning({
        id: users.id,
        email: users.email,
        businessName: users.businessName,
      });

    notifyNewSignup({ email: user.email, businessName: user.businessName });

    await ensureOrganizationForUser(user.id, user.businessName);

    return NextResponse.json(
      { id: user.id, email: user.email, message: "Account created successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    const message = formatError(err);
    const status = err instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
