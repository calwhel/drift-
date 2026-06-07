import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: "sm" | "md";
}

export function Logo({ className, showSubtitle = true, size = "md" }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-sm bg-drift-purple font-semibold text-white",
          size === "sm" ? "h-5 w-5 text-2xs" : "h-6 w-6 text-xs"
        )}
      >
        D
      </div>
      <div className="flex items-baseline gap-1.5 leading-none">
        <span className={cn("font-semibold tracking-tight text-white", size === "sm" ? "text-xs" : "text-sm")}>
          Drift
        </span>
        {showSubtitle && (
          <span className="text-2xs text-drift-muted">Payment</span>
        )}
      </div>
    </Link>
  );
}
