import { cn } from "@/lib/utils";

type Symbol = "BTC" | "USDT" | "USDC" | "ETH" | "BNB" | "SOL" | string;

function BtcLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#fff"
        d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26l.002-.009-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.696 3.61 2.733z"
      />
    </svg>
  );
}

function UsdtLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        fill="#fff"
        d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.078-7.709 2.12 0 1.042 3.309 1.918 7.709 2.12v7.582h3.913v-7.584c4.393-.202 7.694-1.078 7.694-2.118 0-1.04-3.301-1.916-7.694-2.118"
      />
    </svg>
  );
}

function UsdcLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui,sans-serif">
        $
      </text>
    </svg>
  );
}

function EthLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path fill="#fff" fillOpacity="0.6" d="M16.498 4v8.87l7.497 3.35z" />
      <path fill="#fff" d="M16.498 4L9 16.22l7.498-3.35z" />
      <path fill="#fff" fillOpacity="0.6" d="M16.498 21.968v6.027L24 17.616z" />
      <path fill="#fff" d="M16.498 27.995v-6.028L9 17.616z" />
      <path fill="#fff" fillOpacity="0.2" d="M16.498 20.573l7.497-4.353-7.497-3.348z" />
      <path fill="#fff" fillOpacity="0.6" d="M9 16.22l7.498 4.353v-7.701z" />
    </svg>
  );
}

function BnbLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        fill="#fff"
        d="M12.116 14.404 16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26L6 16zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.143-.003-.003 2.263-2.258zM21.48 16l2.26-2.26L26 16l-2.26 2.26L21.48 16zm-3.291-.002h.002V16L16 18.294l-2.291-2.294h.004L16 13.706l2.189 2.292zM16.003 8.871l-1.99 1.99 1.99 1.99 1.99-1.99-1.99-1.99z"
      />
    </svg>
  );
}

function SolLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#solGrad)" />
      <path
        fill="#fff"
        d="M10.2 19.8c.2-.2.5-.3.8-.3h11.5c.5 0 .7.6.4.9l-1.9 1.9c-.2.2-.5.3-.8.3H8.7c-.5 0-.7-.6-.4-.9l1.9-1.9zm0-4.6c.2-.2.5-.3.8-.3h11.5c.5 0 .7.6.4.9l-1.9 1.9c-.2.2-.5.3-.8.3H8.7c-.5 0-.7-.6-.4-.9l1.9-1.9zm11.9-1.9c.2.2.5.3.8.3h1.9c.5 0 .7-.6.4-.9l-1.9-1.9c-.2-.2-.5-.3-.8-.3h-11.5c-.5 0-.7.6-.4.9l1.9 1.9z"
      />
    </svg>
  );
}

function FallbackLogo({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#4b5563" />
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="system-ui,sans-serif">
        {symbol.slice(0, 1)}
      </text>
    </svg>
  );
}

export function CryptoLogo({ symbol, className }: { symbol: Symbol; className?: string }) {
  const key = symbol.toUpperCase();
  switch (key) {
    case "BTC":
      return <BtcLogo className={className} />;
    case "USDT":
      return <UsdtLogo className={className} />;
    case "USDC":
      return <UsdcLogo className={className} />;
    case "ETH":
      return <EthLogo className={className} />;
    case "BNB":
      return <BnbLogo className={className} />;
    case "SOL":
      return <SolLogo className={className} />;
    default:
      return <FallbackLogo symbol={key} className={className} />;
  }
}

const glowMap: Record<string, string> = {
  BTC: "drop-shadow-[0_0_18px_rgba(247,147,26,0.9)] drop-shadow-[0_0_36px_rgba(247,147,26,0.5)]",
  USDT: "drop-shadow-[0_0_18px_rgba(38,161,123,0.85)] drop-shadow-[0_0_36px_rgba(38,161,123,0.45)]",
  USDC: "drop-shadow-[0_0_18px_rgba(39,117,202,0.85)] drop-shadow-[0_0_36px_rgba(39,117,202,0.45)]",
  ETH: "drop-shadow-[0_0_18px_rgba(98,126,234,0.85)] drop-shadow-[0_0_36px_rgba(98,126,234,0.45)]",
  BNB: "drop-shadow-[0_0_18px_rgba(243,186,47,0.85)] drop-shadow-[0_0_36px_rgba(243,186,47,0.45)]",
  SOL: "drop-shadow-[0_0_18px_rgba(0,255,163,0.7)] drop-shadow-[0_0_36px_rgba(220,31,255,0.4)]",
};

export function CryptoIcon({
  symbol,
  size = "sm",
  className,
  glow = false,
}: {
  symbol: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  glow?: boolean;
}) {
  const sizeMap = {
    xs: "h-5 w-5",
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-[72px] w-[72px]",
  };

  if (glow) {
    const key = symbol.toUpperCase();
    return (
      <CryptoLogo
        symbol={symbol}
        className={cn("shrink-0", sizeMap[size], glowMap[key], className)}
      />
    );
  }

  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden rounded-full", sizeMap[size], className)}>
      <CryptoLogo symbol={symbol} className="h-full w-full" />
    </span>
  );
}
