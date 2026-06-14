import { eq } from "drizzle-orm";
import { db, businessSettings, users } from "./db";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_PRIMARY_COLOR,
  toPublicBranding,
  type PublicBranding,
} from "./branding";

export async function getOrCreateBusinessSettings(userId: string) {
  const [existing] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [user] = await db
    .select({ businessName: users.businessName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [created] = await db
    .insert(businessSettings)
    .values({
      userId,
      businessName: user?.businessName ?? null,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
    })
    .returning();

  return created;
}

export async function getPublicBrandingForUser(userId: string): Promise<PublicBranding> {
  const [settings] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.userId, userId))
    .limit(1);

  if (!settings) {
    const [user] = await db
      .select({ businessName: users.businessName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return toPublicBranding({
      logoUrl: null,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      businessName: user?.businessName ?? null,
      description: null,
    });
  }

  return toPublicBranding(settings);
}
