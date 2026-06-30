import { cn } from "@/lib/utils";
import { statsCards, type StatCardData } from "@/lib/mock-data";
import { Icon, type IconName } from "./icons";

const tileClass: Record<StatCardData["color"], string> = {
  purple: "tile-purple",
  blue: "tile-blue",
  green: "tile-green",
  orange: "tile-orange",
};

export interface LiveStats {
  totalGross?: number;
  totalPayments?: number;
  completed?: number;
  pending?: number;
  customers?: number;
}

function StatCard({ card }: { card: StatCardData }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tileClass[card.color])}>
          <Icon name={card.icon as IconName} className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-[12px] text-drift-muted">{card.label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-tight tabular-nums text-white">{card.value}</p>
      <div className="mt-1.5 flex items-center gap-1 text-[11px]">
        {card.change ? (
          <span className={cn("flex items-center gap-0.5 font-medium", card.positive ? "text-drift-green" : "text-drift-red")}>
            <Icon name={card.positive ? "ArrowUpRight" : "ArrowDownRight"} className="h-3 w-3" />
            {card.change.replace(/^[+-]/, "")}
          </span>
        ) : null}
        <span className="text-drift-muted">{card.sub}</span>
      </div>
    </div>
  );
}

function buildCards(live?: LiveStats | null): StatCardData[] {
  if (!live) return statsCards;

  return statsCards.map((card) => {
    const liveSub = "from your account";
    switch (card.label) {
      case "Total Gross":
        return {
          ...card,
          value: `$${(live.totalGross ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          change: "",
          sub: liveSub,
        };
      case "Total Payments":
        return { ...card, value: String(live.totalPayments ?? 0), change: "", sub: liveSub };
      case "Completed":
        return { ...card, value: String(live.completed ?? 0), change: "", sub: liveSub };
      case "Pending":
        return {
          ...card,
          value: String(live.pending ?? 0),
          positive: (live.pending ?? 0) <= 14,
          change: "",
          sub: liveSub,
        };
      default:
        return card;
    }
  });
}

export function StatsRow({ live, className }: { live?: LiveStats | null; className?: string }) {
  const cards = buildCards(live);

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {cards.map((card) => (
        <StatCard key={card.label} card={card} />
      ))}
    </div>
  );
}
