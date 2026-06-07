import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showSubtitle = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: "h-7 w-7 text-sm", title: "text-sm", sub: "text-[9px]" },
    md: { icon: "h-8 w-8 text-base", title: "text-base", sub: "text-[10px]" },
    lg: { icon: "h-10 w-10 text-lg", title: "text-xl", sub: "text-xs" },
  };
  const s = sizes[size];

  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-drift-purple font-bold text-white",
          s.icon
        )}
      >
        D
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-wide text-white", s.title)}>DRIFT</span>
        {showSubtitle && (
          <span className={cn("mt-0.5 font-medium tracking-widest text-drift-muted", s.sub)}>
            PAYMENT
          </span>
        )}
      </div>
    </Link>
  );
}
