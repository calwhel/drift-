import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, gt } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db, users, passwordResetTokens } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`reset-password:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);
    const tokenHash = hashToken(token);
    const now = new Date();

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, record.id));

    return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((i) => i.message).join(". ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
