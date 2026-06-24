import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, organizationMembers, teamInvitations, users } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  token: z.string().length(64),
});

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await requireUser({ requireTwoFactor: true });
    const body = await req.json();
    const data = schema.parse(body);
    const now = new Date();

    const [invite] = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.token, data.token), isNull(teamInvitations.acceptedAt)))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found or already accepted" }, { status: 404 });
    }
    if (invite.expiresAt < now) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
    }
    if (invite.email.toLowerCase() !== sessionUser.email.toLowerCase()) {
      return NextResponse.json({ error: "Invitation email does not match signed-in account" }, { status: 403 });
    }

    const [user] = await db
      .select({ id: users.id, organizationId: users.organizationId })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.organizationId && user.organizationId !== invite.organizationId) {
      return NextResponse.json(
        { error: "You are already a member of another organization" },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      if (!user.organizationId) {
        await tx
          .update(users)
          .set({ organizationId: invite.organizationId })
          .where(eq(users.id, user.id));
      }

      await tx
        .insert(organizationMembers)
        .values({
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role,
        })
        .onConflictDoNothing({
          target: [organizationMembers.organizationId, organizationMembers.userId],
        });

      await tx
        .update(teamInvitations)
        .set({ acceptedAt: now })
        .where(eq(teamInvitations.id, invite.id));
    });

    await logAudit(sessionUser.id, "team.invite_accepted", "invitation", invite.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === "TwoFactorRequired") {
      return NextResponse.json({ error: "Two-factor verification required" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
