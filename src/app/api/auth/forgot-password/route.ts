import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users, passwordResetTokens } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getBaseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`forgot-password:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { email } = schema.parse(body);
    const normalized = email.trim().toLowerCase();

    const emailLimit = await rateLimit(`forgot-password:email:${normalized}`, 3, 60_000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { ok: true, message: "If an account exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        { error: "Password reset is not available — email provider not configured." },
        { status: 503 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);

    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
