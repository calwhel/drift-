import { cn } from "@/lib/utils";

interface Stats {
  totalGross: number;
  totalPayments: number;
  completed: number;
  pending: number;
}

export function LiveStatsRow({ stats }: { stats: Stats | null }) {
  const cards = [
    { label: "Total Gross", value: `$${(stats?.totalGross ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, change: "—" },
    { label: "Total Payments", value: String(stats?.totalPayments ?? 0), change: "—" },
    { label: "Completed", value: String(stats?.completed ?? 0), change: "—", positive: true },
    { label: "Pending", value: String(stats?.pending ?? 0), change: "—", positive: false },
    { label: "Customers", value: "—", change: "—", positive: true },
  ];

  return (
    <div className={cn("card flex divide-x divide-drift-border overflow-x-auto")}>
      {cards.map((card) => (
        <div key={card.label} className="min-w-[140px] flex-1 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="section-label">{card.label}</span>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
