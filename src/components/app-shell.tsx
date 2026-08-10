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
    <div className="eventloom-app min-h-screen text-[#302821]">
      <AppHeader active={active} />
      <main className={`mx-auto ${maxWidth} px-5 py-12 sm:px-8 md:py-16`}>
        {backHref ? (
          <Link className="text-[14px] font-semibold text-[#604139] underline decoration-[#c19a7d] underline-offset-4 transition-colors hover:text-[#8a6153]" href={backHref}>
            ← {backLabel}
          </Link>
        ) : null}

        <header className={`flex flex-col justify-between gap-5 ${backHref ? "mt-6" : ""} sm:flex-row sm:items-end`}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6153]">Eventloom creator</p>
            <h1 className="mt-4 font-[family-name:var(--font-playfair)] text-[clamp(2.7rem,5vw,4.2rem)] font-medium leading-[0.92] tracking-[-0.055em]">{title}</h1>
            {description ? <p className="mt-5 max-w-2xl text-[16px] leading-7 text-[#6d6055]">{description}</p> : null}
          </div>
          {action}
        </header>

        <div className="mt-12">{children}</div>
      </main>
    </div>
  );
}
