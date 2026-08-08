"use client";

import { ArrowRight } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { eventDraftEntryPath } from "@/lib/event-entry";

const starterBriefs = {
  wedding: "A luxury bilingual wedding site with guest replies, separate men's and women's hall details, and a soft blush design.",
  birthday: "A modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.",
  engagement: "An elegant engagement site with family wording, Arabic and English text, schedule, location details, and guest replies.",
} as const;

export function StartEventPrompt({
  initialTemplate,
  authenticated = false,
  authConfigured = true,
  signupEnabled = false,
}: {
  initialTemplate?: string;
  authenticated?: boolean;
  authConfigured?: boolean;
  signupEnabled?: boolean;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [brief, setBrief] = useState<string>(starterBriefs[initialTemplate as keyof typeof starterBriefs] ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brief.trim()) {
      textareaRef.current?.focus();
      return;
    }
    router.push(eventDraftEntryPath({
      brief,
      authenticated,
      authConfigured,
      signupEnabled,
    }));
  }

  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in to continue" : "Create free draft";
  const helperText = !authConfigured
    ? "Local demo — drafts are temporary and reset with the server."
    : !authenticated && !signupEnabled
      ? "Invited beta — sign in to save your description."
      : "Takes about a minute. You can edit everything after.";

  return (
    <form onSubmit={submit} className="border border-[#302821]/15 bg-[#fffaf3] shadow-[0_18px_55px_rgba(65,43,28,0.12)]">
      <label htmlFor="event-brief" className="block px-5 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6153]">
        Describe your event
      </label>
      <textarea
        ref={textareaRef}
        id="event-brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        maxLength={2000}
        rows={4}
        aria-label="Describe your event"
        placeholder="A garden wedding with dinner, dancing, and a thoughtful RSVP for our guests…"
        className="mt-2 w-full resize-none bg-transparent px-5 py-1 text-[16px] leading-7 text-[#302821] outline-none placeholder:text-[#a89b90]"
      />
      <div className="border-t border-[#302821]/10 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-medium text-[#796c61]">Start with</span>
          {Object.entries(starterBriefs).map(([key, value]) => (
            <button key={key} type="button" onClick={() => setBrief(value)} className="rounded-full border border-[#302821]/10 px-3 py-1.5 text-[11px] font-medium capitalize text-[#574c43] transition hover:border-[#a37561] hover:bg-[#f3e7d9]">
              {key}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12px] leading-5 text-[#796c61]">{helperText}</span>
          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#302821] px-5 py-2.5 text-[13px] font-semibold text-[#fffaf3] transition hover:bg-[#4a2d2a] active:scale-[0.98]">
            {ctaLabel}
            <ArrowRight className="size-3.5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </form>
  );
}
