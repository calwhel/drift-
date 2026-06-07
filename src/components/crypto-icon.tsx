import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  USDT: "bg-drift-green",
  BTC: "bg-drift-orange",
  USDC: "bg-blue-500",
  ETH: "bg-purple-400",
  BNB: "bg-yellow-500",
};

export function CryptoIcon({
  symbol,
  size = "sm",
}: {
  symbol: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" };
  const letter = symbol.slice(0, 1);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        colors[symbol] || "bg-drift-purple",
        sizeClasses[size]
      )}
    >
      {letter}
    </div>
  );
}
