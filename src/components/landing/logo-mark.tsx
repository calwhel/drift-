import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/drift-logo.svg";
const ICON_SRC = "/brand/drift-icon.svg";

interface LogoMarkProps {
  className?: string;
  href?: string;
}

export function LogoMark({ className, href = "/" }: LogoMarkProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="Drift Payment"
      width={248}
      height={64}
      priority
      className={cn("h-9 w-auto", className)}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center">
      {image}
    </Link>
  );
}

export function LogoMarkCompact({ className, href }: LogoMarkProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="Drift Payment"
      width={248}
      height={64}
      className={cn("h-6 w-auto", className)}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center">
      {image}
    </Link>
  );
}

/** Icon-only mark for favicons and tight spaces */
export function LogoIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <Image
      src={ICON_SRC}
      alt="Drift"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}
