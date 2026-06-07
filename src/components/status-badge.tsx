import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/mock-data";

const styles: Record<TransactionStatus, string> = {
  Completed: "bg-drift-green/10 text-drift-green border-drift-green/20",
  Pending: "bg-drift-orange/10 text-drift-orange border-drift-orange/20",
  Failed: "bg-drift-red/10 text-drift-red border-drift-red/20",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
