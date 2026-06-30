import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { notifySupportRequest } from "@/lib/telegram";

const schema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters").max(4000),
  subject: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const ip = req.headers.get("x-forwarded-for") ?? user.id;
    const limit = rateLimit(`support:${ip}`, 5, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    const body = await req.json();
    const data = schema.parse(body);
    const email = user.email ?? "unknown";

    const fullMessage = data.subject
      ? `Subject: ${data.subject}\n\n${data.message.trim()}`
      : data.message.trim();

    notifySupportRequest({ email, message: fullMessage });

    return NextResponse.json({ ok: true, message: "Support request sent" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues.map((i) => i.message).join(". ") }, { status: 400 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Support request error:", err);
    return NextResponse.json({ error: "Failed to send support request" }, { status: 500 });
  }
}
