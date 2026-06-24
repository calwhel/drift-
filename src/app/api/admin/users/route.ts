import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Forbidden" || message === "TwoFactorRequired" ? 403 : 401 }
    );
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      businessName: users.businessName,
      isAdmin: users.isAdmin,
      emailVerified: users.emailVerified,
      totpEnabled: users.twoFactorEnabled,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ data: rows });
}
