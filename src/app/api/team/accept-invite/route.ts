import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, users, teamInvitations, organizationMembers, organizations } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const postSchema = z.object({
  token: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const [invite] = await db
    .select({
      email: teamInvitations.email,
      role: teamInvitations.role,
      expiresAt: teamInvitations.expiresAt,
      acceptedAt: teamInvitations.acceptedAt,
      organizationName: organizations.name,
    })
    .from(teamInvitations)
    .innerJoin(organizations, eq(teamInvitations.organizationId, organizations.id))
    .where(eq(teamInvitations.token, token))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: "Invitation already accepted" }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organization_name: invite.organizationName,
    expires_at: invite.expiresAt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser();
    const body = await req.json();
    const { token } = postSchema.parse(body);

    const [invite] = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.token, token), isNull(teamInvitations.acceptedAt)))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found or already used" }, { status: 404 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    const [existingMember] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, invite.organizationId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .limit(1);

    if (!existingMember) {
      await db.insert(organizationMembers).values({
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      });
    }

    await db
      .update(users)
      .set({ organizationId: invite.organizationId })
      .where(eq(users.id, user.id));

    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.id, invite.id));

    await logAudit(user.id, "team.invite_accepted", "invitation", invite.id);

    return NextResponse.json({ ok: true, organization_id: invite.organizationId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Accept invite error:", err);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
