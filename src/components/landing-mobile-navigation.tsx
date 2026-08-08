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
        className="flex h-10 items-center rounded-full border border-white/15 px-4 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
      >
        Menu
      </button>
      {open ? (
        <nav id="landing-mobile-navigation" aria-label="Mobile navigation" className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-white/10 bg-[#211b28] p-2 shadow-[0_18px_48px_rgba(5,2,11,0.38)]">
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
