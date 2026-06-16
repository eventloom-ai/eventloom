"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/ui/fade-in";
import type { BuildJobStatus } from "@/lib/agent/progress";
import { publicSiteHost } from "@/lib/public-url";
import type { EventRecord } from "@/lib/types";

function statusLabel(status: EventRecord["status"], isBuilding: boolean) {
  if (isBuilding) return "Building";
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function statusStyles(status: EventRecord["status"], isBuilding: boolean) {
  if (isBuilding) return "bg-[#e3f2fd] text-[#1565c0]";
  if (status === "published") return "bg-[#e8f5e9] text-[#1b5e20]";
  if (status === "archived") return "bg-[#f5f5f7] text-[#6e6e73]";
  return "bg-[#fff8e1] text-[#8d6e00]";
}

export function EventsList({ events, activeJobs: initialJobs }: { events: EventRecord[]; activeJobs: BuildJobStatus[] }) {
  const previewHost = publicSiteHost();
  const [activeJobs, setActiveJobs] = useState(initialJobs);

  useEffect(() => {
    setActiveJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const response = await fetch("/api/events/build/active", { cache: "no-store" }).catch(() => null);
      if (!response?.ok || cancelled) return;
      const payload = (await response.json()) as { jobs: BuildJobStatus[] };
      if (!cancelled) {
        setActiveJobs(payload.jobs);
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const jobByEventId = new Map(activeJobs.filter((job) => job.eventId).map((job) => [job.eventId as string, job]));

  return (
    <div className="grid gap-4">
      {events.map((event, index) => {
        const job = jobByEventId.get(event.id);
        const isBuilding = job?.status === "running";

        return (
          <FadeIn key={event.id} delay={index * 60}>
            <article
              className={`rounded-2xl border bg-white p-6 transition-shadow md:p-7 ${
                isBuilding ? "border-[#0071e3]/20 shadow-[0_8px_30px_rgba(0,113,227,0.08)]" : "border-black/[0.06] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              }`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[21px] font-semibold tracking-tight">{event.config.title}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${statusStyles(event.status, isBuilding)}`}>
                      {statusLabel(event.status, isBuilding)}
                    </span>
                  </div>
                  <p className="mt-2 text-[14px] text-[#6e6e73]">
                    {previewHost}/{event.slug}
                  </p>

                  {isBuilding && job ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-[12px] text-[#6e6e73]">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0071e3]" />
                          {job.progressMessage ?? "Building your site…"}
                        </span>
                        <span className="tabular-nums">{job.progressPercent}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#0071e3] transition-all duration-500"
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#f5f5f7]"
                    href={`/${event.slug}`}
                  >
                    Preview
                  </Link>
                  {isBuilding ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-[#0071e3] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#0077ed]"
                      href="/app/events/new"
                    >
                      Open build
                    </Link>
                  ) : (
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-[#1d1d1f] px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
                      href={`/app/events/${event.id}`}
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </FadeIn>
        );
      })}
    </div>
  );
}
