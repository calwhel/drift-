import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, businessSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  logo_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const DEFAULT_SETTINGS = {
  logoUrl: null as string | null,
  primaryColor: "#7c3aed",
  backgroundColor: "#0a0a0f",
};

export async function GET() {
  try {
    const user = await requireUser({ requireTwoFactor: true });
    const [settings] = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.userId, user.id))
      .limit(1);

    return NextResponse.json({
      logo_url: settings?.logoUrl ?? DEFAULT_SETTINGS.logoUrl,
      primary_color: settings?.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
      background_color: settings?.backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TwoFactorRequired") {
      return NextResponse.json({ error: "Two-factor verification required" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser({ requireTwoFactor: true });
    const body = await req.json();
    const data = updateSchema.parse(body);
    const now = new Date();

    const [saved] = await db
      .insert(businessSettings)
      .values({
        userId: user.id,
        logoUrl: data.logo_url ?? null,
        primaryColor: data.primary_color ?? DEFAULT_SETTINGS.primaryColor,
        backgroundColor: data.background_color ?? DEFAULT_SETTINGS.backgroundColor,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: businessSettings.userId,
        set: {
          logoUrl: data.logo_url ?? null,
          primaryColor: data.primary_color ?? DEFAULT_SETTINGS.primaryColor,
          backgroundColor: data.background_color ?? DEFAULT_SETTINGS.backgroundColor,
          updatedAt: now,
        },
      })
      .returning();

    await logAudit(user.id, "business_settings.updated", "business_settings", saved.id);

    return NextResponse.json({
      logo_url: saved.logoUrl,
      primary_color: saved.primaryColor,
      background_color: saved.backgroundColor,
    });
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
    return NextResponse.json({ error: "Failed to update business settings" }, { status: 500 });
  }
}
