"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EventloomLogo } from "@/components/logo";

const links = [["All policies", "/legal"], ["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Domains", "/legal/domains"], ["Accessibility", "/legal/accessibility"], ["Security", "/legal/security"], ["Contact", "/contact"]] as const;

export function shouldRenderGlobalLegalFooter(pathname: string | null) {
  return !(pathname?.startsWith("/app/events/") && pathname.endsWith("/studio"));
}

export function GlobalLegalFooter() {
  const pathname = usePathname();
  if (!shouldRenderGlobalLegalFooter(pathname)) return null;

  return (
    <footer className="border-t border-[#302821]/10 bg-[#f7f1e8] px-6 py-8 text-[#66594f]">
      <nav aria-label="Legal and support" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        <Link href="/" className="font-semibold text-[#302821]">
          <EventloomLogo markClassName="size-6" />
        </Link>
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="underline-offset-4 hover:underline">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
