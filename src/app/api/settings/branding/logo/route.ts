import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, businessSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateBusinessSettings } from "@/lib/business-settings";
import { fileToDataUrl, validateLogoFile } from "@/lib/branding";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("logo");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Logo file is required" }, { status: 400 });
    }

    const validationError = validateLogoFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const logoUrl = await fileToDataUrl(file);
    await getOrCreateBusinessSettings(user.id);

    const [updated] = await db
      .update(businessSettings)
      .set({ logoUrl, updatedAt: new Date() })
      .where(eq(businessSettings.userId, user.id))
      .returning({ logoUrl: businessSettings.logoUrl });

    return NextResponse.json({ logoUrl: updated.logoUrl });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await getOrCreateBusinessSettings(user.id);

    await db
      .update(businessSettings)
      .set({ logoUrl: null, updatedAt: new Date() })
      .where(eq(businessSettings.userId, user.id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
