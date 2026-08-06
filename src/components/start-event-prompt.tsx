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
  signupEnabled = false,
}: {
  initialTemplate?: string;
  authenticated?: boolean;
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
      signupEnabled,
    }));
  }

  const ctaLabel = !authenticated && !signupEnabled ? "Sign in to continue" : "Create free draft";
  const helperText = !authenticated && !signupEnabled
    ? "Invited beta — sign in to save your description."
    : "Takes about a minute. You can edit everything after.";

  return (
    <form
      onSubmit={submit}
      className="rounded-[1.35rem] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(37,35,41,0.04),0_24px_64px_rgba(37,35,41,0.08)]"
    >
      <label htmlFor="event-brief" className="block px-5 pt-5 text-[12px] font-medium tracking-wide text-[#6f6a72]">
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
        placeholder="Example: A warm summer wedding for Maya and Adam — dinner, dancing, and RSVPs online…"
        className="mt-2 w-full resize-none bg-transparent px-5 py-1 text-[16px] leading-7 text-[#252329] outline-none placeholder:text-[#9a969e]"
      />
      <div className="flex flex-col gap-3 border-t border-black/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="text-[12px] leading-5 text-[#86818a]">{helperText}</span>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252329] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black active:scale-[0.98]"
        >
          {ctaLabel}
          <ArrowRight className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
    </form>
  );
}
