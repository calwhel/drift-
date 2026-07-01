import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, transactions } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.createdAt));

    const customers = new Map<
      string,
      {
        email: string;
        totalSpent: number;
        paymentCount: number;
        currencies: Set<string>;
        lastPaymentAt: Date;
      }
    >();

    for (const tx of rows) {
      if (tx.status !== "completed") continue;
      const email = tx.customerEmail?.trim() || "Unknown customer";
      const existing = customers.get(email.toLowerCase()) ?? {
        email,
        totalSpent: 0,
        paymentCount: 0,
        currencies: new Set<string>(),
        lastPaymentAt: new Date(tx.createdAt),
      };
      existing.totalSpent += Number(tx.amount);
      existing.paymentCount += 1;
      existing.currencies.add(tx.currency);
      if (new Date(tx.createdAt) > existing.lastPaymentAt) {
        existing.lastPaymentAt = new Date(tx.createdAt);
      }
      customers.set(email.toLowerCase(), existing);
    }

    const data = Array.from(customers.values())
      .map((c) => ({
        email: c.email,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
        paymentCount: c.paymentCount,
        currencies: Array.from(c.currencies),
        lastPaymentAt: c.lastPaymentAt.toISOString(),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({ customers: data, total: data.length });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
