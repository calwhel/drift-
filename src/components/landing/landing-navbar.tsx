"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "./logo-mark";
import { Icon } from "../icons";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Developers", href: "/developers", isRoute: true },
  { label: "Resources", href: "#features", hasChevron: true },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e1e2e]/80 bg-[#0a0a0f]/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-[72px] max-w-[1280px] items-center px-5 lg:px-8">
        <LogoMark />

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                href={link.href}
                className="text-[14px] font-medium text-[#9ca3af] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 text-[14px] font-medium text-[#9ca3af] transition-colors hover:text-white"
              >
                {link.label}
                {link.hasChevron && <Icon name="ChevronDown" className="h-3.5 w-3.5 opacity-70" />}
              </a>
            )
          )}
        </div>

        <div className="ml-auto hidden items-center gap-6 lg:flex">
          <Link href="/auth/login" className="text-[14px] font-medium text-[#9ca3af] transition-colors hover:text-white">
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#7c3aed] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_20px_rgba(124,58,237,0.35)] transition-colors hover:bg-[#6d28d9]"
          >
            Get Started Free
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-white/5 lg:hidden"
          aria-label="Menu"
        >
          <Icon name={open ? "X" : "Menu"} className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-[#1e1e2e] bg-[#0a0a0f] px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] text-[#9ca3af] hover:bg-[#111118] hover:text-white"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] text-[#9ca3af] hover:bg-[#111118] hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-[#1e1e2e] pt-4">
            <Link href="/auth/login" onClick={() => setOpen(false)} className="px-3 py-2.5 text-[15px] text-[#9ca3af]">
              Login
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-[#7c3aed] px-3 py-2.5 text-center text-[15px] font-semibold text-white"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
