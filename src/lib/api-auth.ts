import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db, apiKeys } from "./db";
import { requireUser } from "./auth";

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  const raw = `drift_${randomBytes(32).toString("hex")}`;
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, 12),
  };
}

export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7);
    const hash = hashApiKey(key);
    const [record] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash))
      .limit(1);
    if (record) {
      return { userId: record.userId, via: "api_key" as const };
    }
  }

  try {
    const user = await requireUser({ requireTwoFactor: true });
    return { userId: user.id, via: "session" as const };
  } catch {
    return null;
  }
}
