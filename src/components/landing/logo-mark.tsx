import Link from "next/link";

export function LogoMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logoGrad" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <path
          d="M6 10h6c4 0 7 3 7 7s-3 7-7 7H8v-8l-2-6zM14 17c1.5 0 2.5-1 2.5-2.5S15.5 12 14 12h-4v5h4z"
          fill="url(#logoGrad)"
        />
        <path d="M20 8v16l4-2V10l-4-2z" fill="url(#logoGrad)" opacity="0.9" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-bold italic tracking-tight text-white">DRIFT</span>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-px w-2 bg-drift-purple/60" />
          <span className="text-[9px] font-medium tracking-[0.2em] text-drift-purple">PAYMENT</span>
          <span className="h-px w-2 bg-drift-purple/60" />
        </div>
      </div>
    </Link>
  );
}
