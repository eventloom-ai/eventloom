import Link from "next/link";
import { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";

type AppShellProps = {
  backHref?: string;
  backLabel?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  width?: "narrow" | "wide";
  active?: "home" | "events" | "profile";
};

export function AppShell({
  backHref,
  backLabel = "Back",
  title,
  description,
  action,
  children,
  width = "wide",
  active = "events",
}: AppShellProps) {
  const maxWidth = width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-6xl" : "max-w-5xl";

  return (
    <div className="min-h-screen text-[#302821]">
      <AppHeader active={active} />
      <div className="eventloom-app">
        <main className={`mx-auto ${maxWidth} px-6 py-8 md:py-10`}>
          {backHref ? (
            <Link className="text-[13px] font-medium text-[#155166] transition-colors hover:text-[#0b2d39]" href={backHref}>
              ← {backLabel}
            </Link>
          ) : null}

          <header className={`flex flex-col gap-4 ${backHref ? "mt-5" : ""} sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-[28px] font-semibold tracking-[-0.03em] md:text-[32px]">{title}</h1>
              {description ? <p className="mt-1.5 max-w-xl text-[15px] leading-6 text-[#66736c]">{description}</p> : null}
            </div>
            {action}
          </header>

          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
