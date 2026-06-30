import { CryptoIcon } from "../crypto-icon";

export function FloatingCoins() {
  return (
    <>
      <div className="absolute -left-6 top-10 z-30" style={{ transform: "translateZ(60px)" }}>
        <div className="animate-[float_6s_ease-in-out_infinite]">
          <CryptoIcon symbol="BTC" size="xl" glow />
        </div>
      </div>

      <div className="absolute -left-4 bottom-16 z-30" style={{ transform: "translateZ(50px)" }}>
        <div className="animate-[float_7s_ease-in-out_infinite_1s]">
          <CryptoIcon symbol="USDT" size="lg" glow className="h-14 w-14" />
        </div>
      </div>

      <div className="absolute -right-4 top-[38%] z-30" style={{ transform: "translateZ(55px)" }}>
        <div className="animate-[float_5.5s_ease-in-out_infinite_0.5s]">
          <CryptoIcon symbol="USDC" size="xl" glow className="h-16 w-16" />
        </div>
      </div>
    </>
  );
}
