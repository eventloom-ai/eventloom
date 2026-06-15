import Link from "next/link";

type AppHeaderProps = {
  active?: "home" | "events";
};

export function AppHeader({ active = "events" }: AppHeaderProps) {
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
        </nav>
      </div>
    </header>
  );
}
