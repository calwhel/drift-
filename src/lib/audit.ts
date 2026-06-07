import { db, auditLogs } from "./db";

export async function logAudit(
  userId: string | null,
  action: string,
  resource?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
  organizationId?: string | null
) {
  await db.insert(auditLogs).values({
    userId,
    organizationId: organizationId ?? null,
    action,
    resource,
    resourceId,
    metadata,
  });
}
