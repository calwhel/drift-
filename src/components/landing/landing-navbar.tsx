"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "./logo-mark";
import { Icon } from "../icons";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Developers", href: "/dashboard", isRoute: true },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#features" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 lg:max-w-[1280px] lg:px-8">
        <LogoMark />

        {/* Desktop nav — center */}
        <div className="hidden flex-1 items-center justify-center gap-6 lg:flex lg:gap-8">
          {navLinks.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13px] text-[#9ca3af] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-1 text-[13px] text-[#9ca3af] transition-colors hover:text-white"
              >
                {link.label}
                {link.label === "Resources" && <Icon name="ChevronDown" className="h-3.5 w-3.5" />}
              </a>
            )
          )}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-4 lg:flex lg:gap-5">
          <Link href="/dashboard" className="text-[13px] text-[#9ca3af] hover:text-white">
            Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded bg-[#7c3aed] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#6d28d9]"
          >
            Get Started Free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded border border-[#1e1e2e] text-[#9ca3af] lg:hidden"
          aria-label="Menu"
        >
          <Icon name={open ? "X" : "Menu"} className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#1e1e2e] bg-[#0a0a0f] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) =>
              link.isRoute ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2.5 text-sm text-[#9ca3af] hover:bg-[#111118] hover:text-white"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded px-3 py-2.5 text-sm text-[#9ca3af] hover:bg-[#111118] hover:text-white"
                >
                  {link.label}
                </a>
              )
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-[#1e1e2e] pt-4">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded px-3 py-2.5 text-center text-sm text-[#9ca3af] hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded bg-[#7c3aed] px-3 py-2.5 text-center text-sm font-medium text-white"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
