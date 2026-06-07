import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, apiKeys } from "@/lib/db";
import { authenticateRequest, generateApiKey } from "@/lib/api-auth";

const createSchema = z.object({ name: z.string().min(1).max(100) });

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth || auth.via !== "session") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, auth.userId))
    .orderBy(desc(apiKeys.createdAt));

  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth || auth.via !== "session") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name } = createSchema.parse(body);
    const { raw, hash, prefix } = generateApiKey();

    const [key] = await db
      .insert(apiKeys)
      .values({
        userId: auth.userId,
        name,
        keyHash: hash,
        keyPrefix: prefix,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json(
      { ...key, api_key: raw },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
  }
}
