export function FloatingCoins() {
  return (
    <>
      {/* Bitcoin — upper left */}
      <div
        className="absolute -left-6 top-10 z-30 flex h-[72px] w-[72px] items-center justify-center rounded-full border border-[#f59e0b40] bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706] shadow-[0_12px_40px_rgba(245,158,11,0.45)]"
        style={{ transform: "translateZ(60px)" }}
      >
        <span className="text-[28px] font-bold text-white drop-shadow-sm">₿</span>
      </div>

      {/* USDT — lower left */}
      <div
        className="absolute -left-4 bottom-16 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-[#22c55e40] bg-gradient-to-br from-[#4ade80] via-[#22c55e] to-[#16a34a] shadow-[0_10px_32px_rgba(34,197,94,0.4)]"
        style={{ transform: "translateZ(50px)" }}
      >
        <span className="text-lg font-bold text-white">₮</span>
      </div>

      {/* USDC — right */}
      <div
        className="absolute -right-4 top-[38%] z-30 flex h-16 w-16 items-center justify-center rounded-full border border-[#3b82f640] bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#2563eb] shadow-[0_12px_36px_rgba(59,130,246,0.4)]"
        style={{ transform: "translateZ(55px)" }}
      >
        <span className="text-2xl font-bold text-white">$</span>
      </div>
    </>
  );
}
