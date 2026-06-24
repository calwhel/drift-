import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users, organizationMembers, organizations } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await requireUser({ requireTwoFactor: true });
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.organizationId) {
      return NextResponse.json({ members: [], organization: null });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId))
      .limit(1);

    const members = await db
      .select({
        id: organizationMembers.id,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
        userId: users.id,
        email: users.email,
        businessName: users.businessName,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, user.organizationId));

    return NextResponse.json({ organization: org, members });
  } catch (err) {
    if (err instanceof Error && err.message === "TwoFactorRequired") {
      return NextResponse.json({ error: "Two-factor verification required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
