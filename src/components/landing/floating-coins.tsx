import { CryptoIcon } from "../crypto-icon";

export function FloatingCoins() {
  return (
    <>
      <div
        className="absolute -left-6 top-10 z-30 shadow-[0_12px_40px_rgba(245,158,11,0.45)]"
        style={{ transform: "translateZ(60px)" }}
      >
        <CryptoIcon symbol="BTC" size="xl" className="shadow-[0_12px_40px_rgba(245,158,11,0.45)]" />
      </div>

      <div
        className="absolute -left-4 bottom-16 z-30 shadow-[0_10px_32px_rgba(34,197,94,0.4)]"
        style={{ transform: "translateZ(50px)" }}
      >
        <CryptoIcon symbol="USDT" size="lg" className="h-14 w-14 shadow-[0_10px_32px_rgba(34,197,94,0.4)]" />
      </div>

      <div
        className="absolute -right-4 top-[38%] z-30 shadow-[0_12px_36px_rgba(59,130,246,0.4)]"
        style={{ transform: "translateZ(55px)" }}
      >
        <CryptoIcon symbol="USDC" size="xl" className="h-16 w-16 shadow-[0_12px_36px_rgba(59,130,246,0.4)]" />
      </div>
    </>
  );
}
