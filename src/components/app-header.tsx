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
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#fbfbfd]/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link className="text-[17px] font-semibold text-[#1d1d1f]" href="/">
          <EventloomLogo markClassName="size-7" />
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <Link
            className={`hidden rounded-full px-4 py-2 transition-colors sm:inline-flex ${
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
              <Link
                href="/app/profile"
                aria-label={`Profile for ${displayName}`}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-2 py-1.5 transition-colors ${
                  active === "profile"
                    ? "bg-[#1d1d1f] font-medium text-white"
                    : "text-[#6e6e73] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                  active === "profile" ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700"
                }`}>{initial}</span>
                <span className="hidden max-w-[8rem] truncate sm:inline">Profile</span>
              </Link>
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
