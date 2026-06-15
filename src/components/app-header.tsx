import Link from "next/link";
import { getServerUser } from "@/lib/supabase/server";

type AppHeaderProps = {
  active?: "home" | "events";
};

export async function AppHeader({ active = "events" }: AppHeaderProps) {
  const user = await getServerUser();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link className="text-[17px] font-semibold tracking-tight" href="/">
          Eventloom
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <Link
            className={`rounded-full px-4 py-2 transition-colors ${
              active === "home" ? "font-medium text-[#1d1d1f]" : "text-[#6e6e73] hover:text-[#1d1d1f]"
            }`}
            href="/"
          >
            Home
          </Link>
          {user ? (
            <Link
              className={`rounded-full px-4 py-2 transition-colors ${
                active === "events"
                  ? "bg-[#1d1d1f] font-medium text-white"
                  : "text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}
              href="/app"
            >
              My events
            </Link>
          ) : (
            <Link
              className="rounded-full px-4 py-2 text-[#6e6e73] transition-colors hover:text-[#1d1d1f]"
              href="/login?next=/app"
            >
              Sign in
            </Link>
          )}
          {user ? (
            <div className="ms-2 flex items-center gap-2 border-s border-black/[0.08] ps-3">
              <span className="hidden max-w-[10rem] truncate text-[#6e6e73] sm:inline">{displayName}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full px-3 py-2 text-[#6e6e73] transition-colors hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              className="ms-1 rounded-full bg-[#1d1d1f] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
              href="/signup?next=/app"
            >
              Get started
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
