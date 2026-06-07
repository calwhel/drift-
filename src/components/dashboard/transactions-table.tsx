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
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-drift-border text-left text-xs text-drift-muted">
            <th className="pb-3 pr-4 font-medium">Transaction</th>
            <th className="pb-3 pr-4 font-medium">Customer</th>
            <th className="pb-3 pr-4 font-medium">Amount</th>
            <th className="pb-3 pr-4 font-medium">Currency</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Date</th>
            {!limit && <th className="pb-3 pl-4 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {data.map((tx) => (
            <tr key={tx.id} className="border-b border-drift-border/50 text-sm">
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-2.5">
                  <CryptoIcon symbol={tx.currency} />
                  <span className="font-medium text-drift-purple">{tx.id}</span>
                </div>
              </td>
              <td className="py-3.5 pr-4 text-white">{tx.customer}</td>
              <td className="py-3.5 pr-4 text-white">{tx.amount}</td>
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-1.5">
                  <CryptoIcon symbol={tx.currency} size="sm" />
                  <span className="text-drift-muted">{tx.currency}</span>
                </div>
              </td>
              <td className="py-3.5 pr-4">
                <StatusBadge status={tx.status} />
              </td>
              <td className="py-3.5 text-drift-muted">{tx.date}</td>
              {!limit && (
                <td className="py-3.5 pl-4">
                  <Icon name="ChevronRight" className="h-4 w-4 text-drift-muted" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {showViewAll && (
        <div className="mt-4 text-center">
          <Link href="/dashboard/transactions" className="text-sm font-medium text-drift-purple hover:underline">
            View all transactions
          </Link>
        </div>
      )}
    </div>
  );
}
