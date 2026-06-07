export function FloatingCoins() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      <div className="absolute -left-10 top-16 z-20 flex h-16 w-16 items-center justify-center rounded-full border border-[#f59e0b33] bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-[0_8px_32px_rgba(245,158,11,0.3)]">
        <span className="text-2xl font-bold text-white">₿</span>
      </div>
      <div className="absolute -left-6 bottom-20 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-[#22c55e33] bg-gradient-to-br from-[#22c55e] to-[#16a34a] shadow-[0_8px_24px_rgba(34,197,94,0.25)]">
        <span className="text-sm font-bold text-white">₮</span>
      </div>
      <div className="absolute -right-8 top-1/3 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-[#3b82f633] bg-gradient-to-br from-[#3b82f6] to-[#2563eb] shadow-[0_8px_28px_rgba(59,130,246,0.25)]">
        <span className="text-xl font-bold text-white">$</span>
      </div>
    </div>
  );
}
