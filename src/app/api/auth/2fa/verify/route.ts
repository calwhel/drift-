import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/auth/totp";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  token: z.string().length(6),
  enable: z.boolean().default(true),
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

    if (!user?.totpSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    }

    if (!verifyTotp(data.token, user.totpSecret)) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    if (data.enable) {
      await db
        .update(users)
        .set({ totpEnabled: true })
        .where(eq(users.id, sessionUser.id));
      await logAudit(sessionUser.id, "auth.2fa_enabled");
    }

    return NextResponse.json({ ok: true, enabled: data.enable });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
