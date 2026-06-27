import { cn } from "@/lib/utils";

interface CoinStyle {
  from: string;
  to: string;
  glyph: string;
}

const coins: Record<string, CoinStyle> = {
  USDT: { from: "#2ec27e", to: "#1a9d63", glyph: "₮" },
  BTC: { from: "#f7931a", to: "#d97706", glyph: "₿" },
  USDC: { from: "#3b82f6", to: "#2563eb", glyph: "$" },
  ETH: { from: "#8b5cf6", to: "#6d28d9", glyph: "◆" },
  BNB: { from: "#f3ba2f", to: "#d99e1f", glyph: "◈" },
  SOL: { from: "#14f195", to: "#9945ff", glyph: "◎" },
};

const sizeMap = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-[13px]",
  lg: "h-10 w-10 text-base",
};

export function CryptoIcon({
  symbol,
  size = "sm",
  className,
}: {
  symbol: string;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const coin = coins[symbol] ?? { from: "#6b7280", to: "#4b5563", glyph: symbol.slice(0, 1) };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm",
        sizeMap[size],
        className
      )}
      style={{ background: `linear-gradient(135deg, ${coin.from}, ${coin.to})` }}
    >
      {coin.glyph}
    </div>
  );
}
