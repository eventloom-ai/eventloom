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
      <main className={`mx-auto ${maxWidth} px-6 py-10 md:py-14`}>
        {backHref ? (
          <Link className="text-[14px] font-medium text-[#155166] transition-colors hover:text-[#0b2d39]" href={backHref}>
            ← {backLabel}
          </Link>
        ) : null}

        <header className={`flex flex-col justify-between gap-5 ${backHref ? "mt-6" : ""} sm:flex-row sm:items-end`}>
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-[34px] font-medium tracking-[-0.035em] md:text-[42px]">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[#66736c]">{description}</p> : null}
          </div>
          {action}
        </header>

        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
