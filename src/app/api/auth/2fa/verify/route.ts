import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/auth/totp";
import { logAudit } from "@/lib/audit";

const verifySchema = z.object({
  token: z.string().length(6, "Enter a 6-digit code"),
});

const disableSchema = z.object({
  token: z.string().length(6, "Enter a 6-digit code"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const data = verifySchema.parse(body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.totpSecret) {
      return NextResponse.json({ error: "2FA setup not started" }, { status: 400 });
    }

    if (!verifyTotp(data.token, user.totpSecret)) {
      return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, sessionUser.id));

    await logAudit(sessionUser.id, "auth.2fa_enabled");

    return NextResponse.json({ ok: true, message: "Two-factor authentication enabled" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const data = disableSchema.parse(body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.twoFactorEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
    }

    if (!verifyTotp(data.token, user.totpSecret)) {
      return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
    }

    await db
      .update(users)
      .set({ totpSecret: null, twoFactorEnabled: false })
      .where(eq(users.id, sessionUser.id));

    await logAudit(sessionUser.id, "auth.2fa_disabled");

    return NextResponse.json({ ok: true, message: "Two-factor authentication disabled" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
