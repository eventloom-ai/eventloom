import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export function RsvpSuccess({ className = "", referralHref = "/#create" }: { className?: string; referralHref?: string }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className={`overflow-hidden rounded-[8px] border border-[#405448]/20 bg-[#405448] text-white shadow-sm ${className}`}
    >
      <div className="p-6 sm:p-7">
        <span className="grid size-10 place-items-center rounded-full bg-white text-[#405448]" aria-hidden="true">
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Reply received</h2>
        <p className="mt-2 text-white/80">Your response has been recorded. You can safely close this page.</p>
      </div>

      <div className="border-t border-white/15 bg-black/10 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Made with Eventloom</p>
          <h3 className="mt-2 text-lg font-semibold">Planning something special?</h3>
          <p className="mt-1 text-sm leading-6 text-white/70">Create a beautiful RSVP website in minutes. It’s free to start.</p>
        </div>
        <Link
          href={referralHref}
          prefetch={false}
          className="mt-5 inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#26352d] transition hover:bg-white/90 sm:mt-0"
        >
          Create my RSVP website
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
