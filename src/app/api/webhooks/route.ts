import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db, webhooks } from "@/lib/db";
import { authenticateRequest } from "@/lib/api-auth";

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(["transaction.completed"]),
});

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hooks = await db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      createdAt: webhooks.createdAt,
    })
    .from(webhooks)
    .where(eq(webhooks.userId, auth.userId))
    .orderBy(desc(webhooks.createdAt));

  return NextResponse.json(hooks);
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const secret = randomBytes(32).toString("hex");

    const [hook] = await db
      .insert(webhooks)
      .values({
        userId: auth.userId,
        url: data.url,
        events: data.events,
        secret,
      })
      .returning({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        createdAt: webhooks.createdAt,
      });

    return NextResponse.json({ ...hook, secret }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
