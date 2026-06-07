"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "./logo-mark";
import { Icon } from "../icons";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Developers", href: "/dashboard", isRoute: true },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#features", hasChevron: true },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-sm">
      {/* Desktop navbar — exact original layout */}
      <div className="mx-auto flex h-16 w-full items-center px-4 lg:w-[1280px] lg:px-8">
        <LogoMark />

        <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
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
                {link.hasChevron && <Icon name="ChevronDown" className="h-3.5 w-3.5" />}
              </a>
            )
          )}
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <Link href="/dashboard" className="text-[13px] text-[#9ca3af] transition-colors hover:text-white">
            Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded bg-[#7c3aed] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#6d28d9]"
          >
            Get Started Free
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="ml-auto flex h-9 w-9 items-center justify-center text-[#9ca3af] lg:hidden"
          aria-label="Menu"
        >
          <Icon name={open ? "X" : "Menu"} className="h-5 w-5" />
        </button>
      </div>

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
            <Link href="/dashboard" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm text-[#9ca3af]">
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
