"use client";

import { ArrowRight, Sparkles, WandSparkles } from "lucide-react";
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
  const templates = Object.entries(starterBriefs);

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(37,35,41,0.04),0_24px_64px_rgba(37,35,41,0.08)] sm:p-5"
    >
      <div className="flex items-center gap-2 text-sm text-[#6f6a72]">
        <Sparkles className="size-4 text-emerald-700" />
        Describe your event in one sentence
      </div>
      <textarea
        ref={textareaRef}
        id="event-brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        maxLength={2000}
        rows={3}
        aria-label="Describe your event"
        placeholder="Example: Elegant bilingual wedding website with schedule, location details, and RSVPs."
        className="mt-2 w-full resize-none bg-transparent py-1 text-[16px] leading-7 text-[#252329] outline-none placeholder:text-[#9a969e]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3">
        {templates.map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBrief(value)}
            className="rounded-full border border-black/10 bg-[#f4f4f6] px-3 py-1.5 text-xs font-medium text-[#504a54] transition hover:border-emerald-700/30 hover:bg-emerald-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <WandSparkles className="size-3" />
              {key}
            </span>
          </button>
        ))}
        <button
          type="submit"
          className="ml-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-black active:scale-[0.98]"
        >
          {ctaLabel}
          <ArrowRight className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[#86818a]">{helperText}</p>
    </form>
  );
}
