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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#16121c]/80 text-white shadow-[0_2px_18px_rgba(22,18,28,0.14)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link className="text-[17px] font-semibold text-[#fffaf3]" href="/">
          <EventloomLogo markClassName="size-7" />
        </Link>
        <nav aria-label="Creator navigation" className="flex items-center gap-1 text-sm">
          <Link
            className={`hidden rounded-full px-4 py-2 transition-colors sm:inline-flex ${
              active === "home" ? "bg-white font-semibold text-[#211927]" : "text-white/68 hover:bg-white/10 hover:text-white"
            }`}
            href="/"
          >
            Home
          </Link>
          {user ? (
            <Link
              className={`rounded-full px-4 py-2 transition-colors ${
                active === "events"
                  ? "bg-white font-semibold text-[#211927]"
                  : "text-white/68 hover:bg-white/10 hover:text-white"
              }`}
              href="/app"
            >
              My events
            </Link>
          ) : (
            <Link
              className="rounded-full px-4 py-2 text-white/68 transition-colors hover:text-white"
              href="/login?next=/app"
            >
              Sign in
            </Link>
          )}
          {user ? (
            <div className="ms-2 flex items-center gap-2 border-s border-white/15 ps-3">
              <Link
                href="/app/profile"
                aria-label={`Profile for ${displayName}`}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full px-2 py-1.5 transition-colors ${
                  active === "profile"
                    ? "bg-white/14 font-medium text-white"
                    : "text-white/68 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                  active === "profile" ? "bg-white/20 text-white" : "bg-[#f9e7df] text-[#4a2d2a]"
                }`}>{initial}</span>
                <span className="hidden max-w-[8rem] truncate sm:inline">Profile</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-full px-3 py-2 text-white/68 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              className="ms-1 rounded-full bg-white px-4 py-2 font-semibold text-[#211927] transition hover:bg-[#f9e7df]"
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
