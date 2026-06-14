export type BillingInterval = "week" | "month" | "year";

export function addBillingInterval(date: Date, interval: string): Date {
  const next = new Date(date);
  if (interval === "week") {
    next.setDate(next.getDate() + 7);
  } else if (interval === "year") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function formatInterval(interval: string): string {
  if (interval === "week") return "Weekly";
  if (interval === "year") return "Yearly";
  return "Monthly";
}

export const PAST_DUE_GRACE_MS = 24 * 60 * 60 * 1000;
