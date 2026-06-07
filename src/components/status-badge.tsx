import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/mock-data";

const styles: Record<TransactionStatus, string> = {
  Completed: "text-drift-green",
  Pending: "text-drift-orange",
  Failed: "text-drift-red",
};

const dots: Record<TransactionStatus, string> = {
  Completed: "bg-drift-green",
  Pending: "bg-drift-orange",
  Failed: "bg-drift-red",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-2xs font-medium", styles[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dots[status])} />
      {status}
    </span>
  );
}
