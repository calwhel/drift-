import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, organizations, organizationMembers } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/notifications";
import { rateLimit } from "@/lib/rate-limit";

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

function generateOrganizationSlug(businessName: string): string {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "business";
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`.slice(0, 100);
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

    const businessName = data.businessName.trim();
    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          businessName,
        })
        .returning({ id: users.id, email: users.email });

      const [org] = await tx
        .insert(organizations)
        .values({
          name: businessName,
          slug: generateOrganizationSlug(businessName),
          ownerId: createdUser.id,
        })
        .returning({ id: organizations.id });

      await tx
        .update(users)
        .set({ organizationId: org.id })
        .where(eq(users.id, createdUser.id));

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: createdUser.id,
        role: "admin",
      });

      return createdUser;
    });

    await sendWelcomeEmail({ to: user.email, businessName }).catch((err) => {
      console.warn("Welcome email failed:", err);
    });

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
