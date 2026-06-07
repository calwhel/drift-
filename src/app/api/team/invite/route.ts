import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db, users, teamInvitations } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
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

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await db
      .insert(teamInvitations)
      .values({
        organizationId: user.organizationId,
        email: data.email.toLowerCase(),
        role: data.role,
        token,
        expiresAt,
      })
      .returning();

    await logAudit(sessionUser.id, "team.invite_sent", "invitation", invite.id, {
      email: data.email,
    });

    return NextResponse.json(
      {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invite_url: `/auth/accept-invite?token=${token}`,
        expires_at: invite.expiresAt,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Invite failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessionUser = await requireUser();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.organizationId) {
      return NextResponse.json([]);
    }

    const invites = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.organizationId, user.organizationId),
          isNull(teamInvitations.acceptedAt)
        )
      );

    return NextResponse.json(invites);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
