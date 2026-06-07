import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icons";

interface StatsCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: IconName;
  color: string;
}

const iconColors: Record<string, string> = {
  purple: "bg-drift-purple/10 text-drift-purple",
  blue: "bg-blue-500/10 text-blue-400",
  green: "bg-drift-green/10 text-drift-green",
  orange: "bg-drift-orange/10 text-drift-orange",
};

export function StatsCard({ label, value, change, positive, icon, color }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-drift-border bg-drift-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconColors[color])}>
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xs text-drift-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <div className="mt-2 flex items-center gap-1">
        <Icon
          name={positive ? "ArrowUpRight" : "ArrowDownRight"}
          className={cn("h-3 w-3", positive ? "text-drift-green" : "text-drift-red")}
        />
        <span className={cn("text-xs font-medium", positive ? "text-drift-green" : "text-drift-red")}>
          {change}
        </span>
        <span className="text-xs text-drift-muted">vs Apr 1 - Apr 30</span>
      </div>
    </div>
  );
}
