"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  ["Product", "#product"],
  ["How it works", "#how-it-works"],
  ["Pricing", "#pricing"],
  ["Questions", "#questions"],
  ["Contact", "/contact"],
] as const;

export function LandingMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="landing-mobile-navigation"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 items-center rounded-full border border-[#302821]/15 px-4 text-sm font-medium text-[#302821] transition hover:border-[#302821]/35 hover:bg-[#fffdf9]"
      >
        Menu
      </button>
      {open ? (
        <nav id="landing-mobile-navigation" aria-label="Mobile navigation" className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-[#302821]/10 bg-[#fffdf9] p-2 shadow-[0_18px_48px_rgba(51,39,29,0.16)]">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-[#574c43] transition hover:bg-[#f3ece2] hover:text-[#302821]">
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
