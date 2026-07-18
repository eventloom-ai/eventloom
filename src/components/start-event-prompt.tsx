"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const starterBriefs = {
  wedding: "A luxury bilingual wedding site with guest replies, separate men's and women's hall details, and a soft blush design.",
  birthday: "A modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.",
  engagement: "An elegant engagement site with family wording, Arabic and English text, schedule, location details, and guest replies.",
} as const;

export function StartEventPrompt({ initialTemplate }: { initialTemplate?: string }) {
  const router = useRouter();
  const [brief, setBrief] = useState<string>(starterBriefs[initialTemplate as keyof typeof starterBriefs] ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brief.trim()) return;
    router.push(`/app/events/new?brief=${encodeURIComponent(brief.trim())}`);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl rounded-2xl border border-black/[0.10] bg-white p-2 shadow-[0_26px_80px_rgba(54,42,30,0.10)]">
      <div className="flex items-center gap-2 px-3 pt-3 text-[12px] font-medium text-[#69666c]"><Sparkles className="size-3.5 text-violet-600" /> Eventloom agent</div>
      <textarea value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={2000} rows={5} placeholder="Describe the event you want to create…" className="mt-2 w-full resize-none bg-transparent px-3 py-2 text-[16px] leading-6 text-[#242226] outline-none placeholder:text-[#9a969e]" />
      <div className="flex items-center justify-between border-t border-black/[0.08] px-2 py-2">
        <span className="text-[11px] text-[#86818a]">You’ll shape the details in the studio next.</span>
        <button type="submit" disabled={!brief.trim()} className="inline-flex items-center gap-2 rounded-md bg-violet-500 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-violet-400 disabled:opacity-40"><ArrowUp className="size-3.5" /> Open studio</button>
      </div>
    </form>
  );
}
