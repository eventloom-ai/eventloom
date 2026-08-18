import Link from "next/link";
import { EventloomLogo } from "@/components/logo";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

type AppHeaderProps = {
  active?: "home" | "events" | "profile";
};

export async function AppHeader({ active = "events" }: AppHeaderProps) {
  const user = await getServerUser();
  const client = user ? await createSupabaseServerClient() : null;
  const profile = user && client
    ? await client.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : null;
  const displayName =
    profile?.data?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    null;
  const initial = displayName?.charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b2d39]/95 text-[#fffaf3] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link className="text-[15px] font-semibold text-[#fffaf3]" href="/">
          <EventloomLogo markClassName="size-7" />
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          <Link
            className={`hidden rounded-md px-3 py-1.5 transition-colors sm:inline-flex ${
              active === "home" ? "bg-[#b9d4c1] font-medium text-[#0b2d39]" : "text-white/70 hover:text-white"
            }`}
            href="/"
          >
            Home
          </Link>
          {user ? (
            <Link
              className={`rounded-md px-3 py-1.5 transition-colors ${
                active === "events"
                  ? "bg-[#b9d4c1] font-medium text-[#0b2d39]"
                  : "text-white/70 hover:text-white"
              }`}
              href="/app"
            >
              My events
            </Link>
          ) : (
            <Link
              className="rounded-md px-3 py-1.5 text-white/70 transition-colors hover:text-white"
              href="/login?next=/app"
            >
              Sign in
            </Link>
          )}
          {user ? (
            <div className="ms-2 flex items-center gap-1 border-s border-white/15 ps-3">
              <Link
                href="/app/profile"
                aria-label={`Profile for ${displayName ?? "your account"}`}
                className={`inline-flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors ${
                  active === "profile"
                    ? "bg-[rgba(255,255,255,0.12)] font-medium text-white"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <span className="grid size-7 place-items-center rounded-full bg-[#b9d4c1] text-xs font-semibold text-[#0b2d39]">{initial}</span>
                <span className="hidden max-w-[9rem] truncate sm:inline">{displayName}</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-white/70 transition-colors hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              className="ms-1 rounded-md bg-[#b9d4c1] px-3.5 py-1.5 font-medium text-[#0b2d39] transition hover:bg-[#d8ead9]"
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
