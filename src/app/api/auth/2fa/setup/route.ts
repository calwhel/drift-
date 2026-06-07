import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateTotpSecret, getTotpUri } from "@/lib/auth/totp";

export async function POST() {
  try {
    const sessionUser = await requireUser();
    const secret = generateTotpSecret();

    await db
      .update(users)
      .set({ totpSecret: secret, totpEnabled: false })
      .where(eq(users.id, sessionUser.id));

    const uri = getTotpUri(secret, sessionUser.email ?? "");

    return NextResponse.json({
      secret,
      uri,
      message: "Scan with your authenticator app, then verify with /api/auth/2fa/verify",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
