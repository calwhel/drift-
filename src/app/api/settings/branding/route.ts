import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, businessSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateBusinessSettings } from "@/lib/business-settings";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_PRIMARY_COLOR,
  isValidHexColor,
  normalizeHexColor,
} from "@/lib/branding";

const updateSchema = z.object({
  businessName: z.string().max(255).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});

function serializeSettings(settings: typeof businessSettings.$inferSelect) {
  return {
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    backgroundColor: settings.backgroundColor,
    businessName: settings.businessName,
    description: settings.description,
    updatedAt: settings.updatedAt,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getOrCreateBusinessSettings(user.id);
    return NextResponse.json(serializeSettings(settings));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.primaryColor && !isValidHexColor(data.primaryColor)) {
      return NextResponse.json({ error: "Invalid primary color" }, { status: 400 });
    }
    if (data.backgroundColor && !isValidHexColor(data.backgroundColor)) {
      return NextResponse.json({ error: "Invalid background color" }, { status: 400 });
    }

    await getOrCreateBusinessSettings(user.id);

    const updates: Partial<typeof businessSettings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.businessName !== undefined) {
      updates.businessName = data.businessName?.trim() || null;
    }
    if (data.description !== undefined) {
      updates.description = data.description?.trim() || null;
    }
    if (data.primaryColor) {
      updates.primaryColor = normalizeHexColor(data.primaryColor);
    }
    if (data.backgroundColor) {
      updates.backgroundColor = normalizeHexColor(data.backgroundColor);
    }

    const [updated] = await db
      .update(businessSettings)
      .set(updates)
      .where(eq(businessSettings.userId, user.id))
      .returning();

    return NextResponse.json(serializeSettings(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await getOrCreateBusinessSettings(user.id);

    const [updated] = await db
      .update(businessSettings)
      .set({
        logoUrl: null,
        primaryColor: DEFAULT_PRIMARY_COLOR,
        backgroundColor: DEFAULT_BACKGROUND_COLOR,
        description: null,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.userId, user.id))
      .returning();

    return NextResponse.json(serializeSettings(updated));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
