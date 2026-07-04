import Link from "next/link";
import { LogoMark } from "@/components/landing/logo-mark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4 text-center text-white">
      <LogoMark />
      <h1 className="mt-8 text-4xl font-bold">404</h1>
      <p className="mt-2 text-[#9ca3af]">This page doesn&apos;t exist or has been moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold hover:bg-[#6d28d9]"
        >
          Home
        </Link>
        <Link
          href="/auth/login"
          className="rounded-lg border border-[#2a2a38] px-5 py-2.5 text-sm font-semibold hover:bg-[#111118]"
        >
          Sign in
        </Link>
        <Link
          href="/demo"
          className="rounded-lg border border-[#2a2a38] px-5 py-2.5 text-sm font-semibold hover:bg-[#111118]"
        >
          View demo
        </Link>
      </div>
    </div>
  );
}
