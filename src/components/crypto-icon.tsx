import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  USDT: "text-drift-green",
  BTC: "text-drift-orange",
  USDC: "text-blue-400",
  ETH: "text-violet-400",
  BNB: "text-yellow-500",
};

export function CryptoIcon({
  symbol,
  size = "sm",
}: {
  symbol: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = { sm: "h-4 w-4 text-2xs", md: "h-5 w-5 text-xs" };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-sm border border-drift-border bg-drift-bg font-medium",
        colors[symbol] || "text-drift-muted",
        sizeClasses[size]
      )}
    >
      {symbol.slice(0, 1)}
    </div>
  );
}
