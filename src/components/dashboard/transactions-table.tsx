import Link from "next/link";
import { transactions, type Transaction } from "@/lib/mock-data";
import { CryptoIcon } from "../crypto-icon";
import { StatusBadge } from "../status-badge";
import { Icon } from "../icons";

interface TransactionsTableProps {
  data?: Transaction[];
  limit?: number;
  showViewAll?: boolean;
}

export function TransactionsTable({ data: dataProp, limit, showViewAll }: TransactionsTableProps) {
  const source = dataProp ?? transactions;
  const data = limit ? source.slice(0, limit) : source;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-drift-border text-left text-2xs text-drift-muted">
            <th className="pb-2 pr-3 font-medium">Transaction</th>
            <th className="pb-2 pr-3 font-medium">Customer</th>
            <th className="pb-2 pr-3 font-medium text-right">Amount</th>
            <th className="pb-2 pr-3 font-medium">Currency</th>
            <th className="pb-2 pr-3 font-medium">Status</th>
            <th className="pb-2 font-medium">Date</th>
            {!limit && <th className="pb-2 pl-2 font-medium w-6" />}
          </tr>
        </thead>
        <tbody>
          {data.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-drift-border text-xs hover:bg-drift-hover/50"
            >
              <td className="py-2 pr-3">
                <span className="font-mono text-2xs text-drift-muted">{tx.id}</span>
              </td>
              <td className="py-2 pr-3 text-white">{tx.customer}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-white">{tx.amount}</td>
              <td className="py-2 pr-3">
                <div className="flex items-center gap-1.5">
                  <CryptoIcon symbol={tx.currency} />
                  <span className="text-drift-muted">{tx.currency}</span>
                </div>
              </td>
              <td className="py-2 pr-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="py-2 text-drift-muted">{tx.date}</td>
              {!limit && (
                <td className="py-2 pl-2">
                  <Icon name="ChevronRight" className="h-3 w-3 text-drift-muted" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {showViewAll && (
        <div className="mt-2 border-t border-drift-border pt-2">
          <Link href="/dashboard/transactions" className="text-2xs text-drift-muted hover:text-white">
            View all →
          </Link>
        </div>
      )}
    </div>
  );
}
