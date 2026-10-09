"use client";

import Link from "next/link";
import { useSignedIn } from "@/hooks/use-signed-in";

export function AccountNavLinks({ authConfigured }: { authConfigured: boolean }) {
  const signedIn = useSignedIn();
  return (
    <>
      <Link href={signedIn || !authConfigured ? "/app" : "/login?next=/app"} className="rounded-md px-3 py-1.5 text-[13px] font-medium text-white/75 transition hover:text-white">{signedIn ? "My events" : authConfigured ? "Sign in" : "Open local demo"}</Link>
      <Link href="#top" className="hidden rounded-md bg-white px-3.5 py-1.5 text-[13px] font-semibold text-neutral-900 transition hover:bg-white/90 sm:inline-flex">{signedIn ? "New event" : "Create an event"}</Link>
    </>
  );
}
