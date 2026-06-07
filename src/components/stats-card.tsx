import { cn } from "@/lib/utils";
import { statsCards } from "@/lib/mock-data";

interface StatsRowProps {
  className?: string;
}

export function StatsRow({ className }: StatsRowProps) {
  return (
    <div
      className={cn(
        "card flex divide-x divide-drift-border overflow-x-auto",
        className
      )}
    >
      {statsCards.map((card) => (
        <div key={card.label} className="min-w-[140px] flex-1 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="section-label">{card.label}</span>
            <span
              className={cn(
                "text-2xs tabular-nums",
                card.positive ? "text-drift-green" : "text-drift-red"
              )}
            >
              {card.change}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-white">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
