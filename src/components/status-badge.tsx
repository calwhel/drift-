import { cn } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/mock-data";

const styles: Record<TransactionStatus, string> = {
  Completed: "bg-[#22c55e1f] text-[#4ade80]",
  Pending: "bg-[#f59e0b1f] text-[#fbbf24]",
  Failed: "bg-[#ef44441f] text-[#f87171]",
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
