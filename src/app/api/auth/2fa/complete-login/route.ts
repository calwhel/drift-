import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/auth/totp";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  token: z.string().length(6, "Enter a 6-digit code"),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const data = schema.parse(body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.twoFactorEnabled || !user.totpSecret) {
      return NextResponse.json({ error: "2FA is not enabled on this account" }, { status: 400 });
    }

    if (!verifyTotp(data.token, user.totpSecret)) {
      return NextResponse.json({ error: "Invalid code — try again" }, { status: 400 });
    }

    await logAudit(sessionUser.id, "auth.2fa_login_verified");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
