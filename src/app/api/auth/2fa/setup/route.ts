import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateTotpSecret, generateQrDataUrl } from "@/lib/auth/totp";

export async function GET() {
  try {
    const sessionUser = await requireUser();
    const [user] = await db
      .select({
        twoFactorEnabled: users.twoFactorEnabled,
        totpSecret: users.totpSecret,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    return NextResponse.json({
      enabled: user?.twoFactorEnabled ?? false,
      pendingSetup: Boolean(user?.totpSecret && !user?.twoFactorEnabled),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST() {
  try {
    const sessionUser = await requireUser();

    const [existing] = await db
      .select({ twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (existing?.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }

    const secret = generateTotpSecret(sessionUser.email ?? "user");
    const base32 = secret.base32;
    const otpauthUrl = secret.otpauth_url ?? "";

    await db
      .update(users)
      .set({ totpSecret: base32, twoFactorEnabled: false })
      .where(eq(users.id, sessionUser.id));

    const qrDataUrl = otpauthUrl ? await generateQrDataUrl(otpauthUrl) : "";

    return NextResponse.json({
      qrDataUrl,
      otpauthUrl,
      message: "Scan the QR code with Google Authenticator, then enter the 6-digit code to confirm.",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
