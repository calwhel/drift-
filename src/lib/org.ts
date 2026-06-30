import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, organizations, organizationMembers, users } from "./db";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${nanoid(6)}`;
}

export async function ensureOrganizationForUser(userId: string, businessName: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  if (user.organizationId) return user.organizationId;

  const [org] = await db
    .insert(organizations)
    .values({
      name: businessName.trim(),
      slug: slugify(businessName),
      ownerId: userId,
    })
    .returning({ id: organizations.id });

  await db.update(users).set({ organizationId: org.id }).where(eq(users.id, userId));

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId,
    role: "admin",
  });

  return org.id;
}
