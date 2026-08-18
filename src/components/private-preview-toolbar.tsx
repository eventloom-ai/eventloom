import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { EventStatus } from "@/lib/types";

export function PrivatePreviewToolbar({
  eventId,
  status,
}: {
  eventId: string;
  status: EventStatus;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/90 px-4 py-3 text-[#1d1d1f] shadow-sm backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <Link
          href={`/app/events/${eventId}/studio`}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold transition-colors hover:bg-[#f5f5f7]"
        >
          <ArrowLeft className="size-4" />
          Back to studio
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 font-medium">
            <LockKeyhole className="size-3.5" />
            Private preview
          </span>
          <span className="text-[#6e6e73]">
            {status === "published"
              ? "Reviewing the published version."
              : "Only you can see this draft."}
          </span>
        </div>
      </div>
    </header>
  );
}
