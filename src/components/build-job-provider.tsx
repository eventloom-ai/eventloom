"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BuildJobStatus } from "@/lib/agent/progress";
import { clearStoredBuildJob, readStoredBuildJob } from "@/lib/build-job-store";

type BuildJobContextValue = {
  activeJob: BuildJobStatus | null;
  refreshActiveJob: () => Promise<void>;
};

const BuildJobContext = createContext<BuildJobContextValue>({
  activeJob: null,
  refreshActiveJob: async () => {},
});

export function BuildJobProvider({ children }: { children: ReactNode }) {
  const [activeJob, setActiveJob] = useState<BuildJobStatus | null>(null);

  const refreshActiveJob = useCallback(async () => {
    const stored = readStoredBuildJob();
    if (stored) {
      const response = await fetch(`/api/events/build/${stored.jobId}`, { cache: "no-store" }).catch(() => null);
      if (response?.ok) {
        const job = (await response.json()) as BuildJobStatus;
        if (job.status === "running") {
          setActiveJob(job);
          return;
        }
        clearStoredBuildJob();
      }
    }

    const response = await fetch("/api/events/build/active", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) {
      setActiveJob(null);
      return;
    }

    const payload = (await response.json()) as { jobs: BuildJobStatus[] };
    setActiveJob(payload.jobs[0] ?? null);
  }, []);

  useEffect(() => {
    void refreshActiveJob();
    const timer = window.setInterval(() => {
      void refreshActiveJob();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [refreshActiveJob]);

  const value = useMemo(() => ({ activeJob, refreshActiveJob }), [activeJob, refreshActiveJob]);

  return (
    <BuildJobContext.Provider value={value}>
      {children}
      <BuildJobBanner />
    </BuildJobContext.Provider>
  );
}

export function useActiveBuildJob() {
  return useContext(BuildJobContext);
}

function BuildJobBanner() {
  const { activeJob } = useActiveBuildJob();
  const pathname = usePathname();

  if (!activeJob || activeJob.status !== "running") {
    return null;
  }

  const onStudioPage = pathname === "/app/events/new" || pathname === "/";
  if (onStudioPage) {
    return null;
  }

  const resumeHref = "/app/events/new";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.08] bg-[#1d1d1f]/95 px-4 py-3 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#64b5f6]" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium">
              Building {activeJob.slug ? `/${activeJob.slug}` : "your site"} — {activeJob.progressPercent}%
            </p>
            <p className="truncate text-[12px] text-white/70">{activeJob.progressMessage ?? "Still working…"}</p>
          </div>
        </div>
        <Link
          href={resumeHref}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#1d1d1f] transition-opacity hover:opacity-90"
        >
          Return to build
        </Link>
      </div>
    </div>
  );
}
