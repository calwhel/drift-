import { transactions, type Transaction } from "@/lib/mock-data";
import { CryptoIcon } from "../crypto-icon";
import { StatusBadge } from "../status-badge";
import { Icon } from "../icons";

interface TransactionsTableProps {
  data?: Transaction[];
  limit?: number;
  showChevron?: boolean;
}

function formatAmount(tx: Transaction) {
  if (tx.currency === "USDT" || tx.currency === "USDC") {
    return tx.amount.toFixed(2);
  }
  return String(tx.amount);
}

export function TransactionsTable({ data: dataProp, limit, showChevron }: TransactionsTableProps) {
  const source = dataProp ?? transactions;
  const data = limit ? source.slice(0, limit) : source;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-drift-border text-left text-[12px] text-drift-muted">
            <th className="pb-3 pr-3 font-medium">Transaction</th>
            <th className="pb-3 pr-3 font-medium">Customer</th>
            <th className="pb-3 pr-3 font-medium">Amount</th>
            <th className="pb-3 pr-3 font-medium">Currency</th>
            <th className="pb-3 pr-3 font-medium">Status</th>
            <th className="pb-3 pr-3 font-medium">Date</th>
            {showChevron && <th className="w-6 pb-3" />}
          </tr>
        </thead>
        <tbody>
          {data.map((tx) => (
            <tr key={tx.id} className="border-b border-drift-border/60 transition-colors hover:bg-white/[0.02]">
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2.5">
                  <CryptoIcon symbol={tx.currency} size="sm" />
                  <span className="font-mono text-[12px] font-medium text-[#a78bfa]">{tx.id}</span>
                </div>
              </td>
              <td className="py-3 pr-3 text-white">{tx.customer}</td>
              <td className="py-3 pr-3 tabular-nums text-white">{formatAmount(tx)}</td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={tx.currency} size="xs" />
                  <span className="text-drift-muted">{tx.currency}</span>
                </div>
              </td>
              <td className="py-3 pr-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="py-3 pr-3 text-drift-muted">{tx.date}</td>
              {showChevron && (
                <td className="py-3">
                  <Icon name="ChevronRight" className="h-4 w-4 text-drift-muted" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
