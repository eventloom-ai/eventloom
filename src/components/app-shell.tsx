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
  width?: "narrow" | "wide" | "full";
};

export function AppShell({
  backHref,
  backLabel = "Back",
  title,
  description,
  action,
  children,
  width = "wide",
}: AppShellProps) {
  const maxWidth = width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-6xl" : "max-w-none";
  const spacing = width === "full" ? "px-4 py-5 md:px-6 md:py-6" : "px-6 py-10 md:py-14";
  const contentSpacing = width === "full" ? "mt-5" : "mt-10";

  return (
    <div className="min-h-screen text-[#1d1d1f]">
      <AppHeader active="events" />
      <main className={`mx-auto ${maxWidth} ${spacing}`}>
        {backHref ? (
          <Link className="text-[14px] font-medium text-[#0071e3] transition-colors hover:text-[#0077ed]" href={backHref}>
            ← {backLabel}
          </Link>
        ) : null}

        <header className={`flex flex-col justify-between gap-5 ${backHref ? "mt-6" : ""} sm:flex-row sm:items-end`}>
          <div>
            <h1 className="text-[32px] font-semibold tracking-[-0.02em] md:text-[40px]">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[#6e6e73]">{description}</p> : null}
          </div>
          {action}
        </header>

        <div className={contentSpacing}>{children}</div>
      </main>
    </div>
  );
}
