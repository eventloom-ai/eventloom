"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Check,
  Circle,
  ExternalLink,
  ImagePlus,
  Loader2,
  Monitor,
  Palette,
  Smartphone,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildProgressStep } from "@/lib/agent/progress";
import { resolveEventPalette } from "@/lib/event-theme";
import { publicSiteHost, publicSlugPath } from "@/lib/public-url";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import { useBuildJob } from "@/hooks/use-build-job";

const examples = [
  { label: "Wedding", prompt: "A luxury bilingual wedding site with guest replies, separate men's and women's hall details, and a soft blush design.", mood: "blush" },
  { label: "Birthday", prompt: "A modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.", mood: "sunset" },
  { label: "Engagement", prompt: "An elegant engagement site with family wording, Arabic and English text, schedule, location details, and guest replies.", mood: "gold" },
] as const;

const moods = ["blush", "navy", "gold", "lavender", "forest", "sunset"] as const;
const steps: { id: BuildProgressStep; label: string; detail: string }[] = [
  { id: "started", label: "Brief received", detail: "Your direction is saved" },
  { id: "planning", label: "Planning the experience", detail: "Structure, tone, and flow" },
  { id: "planned", label: "Choosing a visual direction", detail: "Template and palette" },
  { id: "generating", label: "Making your site", detail: "Writing and styling" },
  { id: "saving", label: "Saving your version", detail: "Assets and RSVP details" },
  { id: "done", label: "Ready to review", detail: "Your draft is live" },
];

type SiteBuildStudioProps = { initialPrompt?: string; initialTemplate?: string; variant?: "home" | "app" };

function stepState(step: BuildProgressStep, current: BuildProgressStep) {
  const currentIndex = steps.findIndex((item) => item.id === current);
  const index = steps.findIndex((item) => item.id === step);
  if (current === "error") return "pending";
  return index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";
}

export function SiteBuildStudio({ initialPrompt, initialTemplate, variant = "app" }: SiteBuildStudioProps) {
  const router = useRouter();
  const { state: build, startBuild, resumeStoredJob } = useBuildJob();
  const seed = examples.find((example) => example.label.toLowerCase() === initialTemplate)?.prompt ?? "";
  const [prompt, setPrompt] = useState(initialPrompt ?? seed);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [mood, setMood] = useState<string | null>(examples.find((example) => example.label.toLowerCase() === initialTemplate)?.mood ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewHost = publicSiteHost();
  const suggestedSlug = normalizeSlugInput(suggestSlug(prompt) || "");
  const activeSlug = slugEdited ? slug : suggestedSlug;
  const palette = useMemo(() => (build.previewConfig ? resolveEventPalette(build.previewConfig) : null), [build.previewConfig]);
  const localPreviewImage = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : undefined), [files]);
  const imageUrl = build.previewConfig?.heroImageUrl ?? localPreviewImage;

  useEffect(() => {
    void resumeStoredJob();
  }, [resumeStoredJob]);

  useEffect(() => {
    return () => {
      if (localPreviewImage) URL.revokeObjectURL(localPreviewImage);
    };
  }, [localPreviewImage]);

  function chooseExample(example: (typeof examples)[number]) {
    setPrompt(example.prompt);
    setMood(example.mood);
    setSlugEdited(false);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const images = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...images].slice(0, 4));
    event.target.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("prompt", prompt.trim());
    form.set("slug", activeSlug.trim());
    if (mood) form.set("mood", mood);
    if (initialTemplate === "wedding") form.set("template", "wedding");
    if (build.completedEventId) form.set("event_id", build.completedEventId);
    files.forEach((file) => form.append("images", file));
    await startBuild(form);
  }

  const canBuild = Boolean(prompt.trim() && activeSlug.trim() && !build.isBuilding);
  const previewSlug = build.slug || activeSlug || "your-event";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-black/[0.08] bg-white shadow-[0_24px_80px_rgba(31,36,48,0.10)]">
      <header className="flex flex-col gap-4 border-b border-black/[0.07] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-[#1d1d1f] text-white shadow-lg shadow-black/10"><Sparkles className="size-4" /></div>
          <div>
            <p className="text-[14px] font-semibold tracking-tight">Eventloom Studio</p>
            <p className="text-[12px] text-[#6e6e73]">{build.isBuilding ? "Agent is working on your site" : build.completedEventId ? "Draft ready for review" : "Start with a creative brief"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${build.isBuilding ? "bg-[#e8f3ff] text-[#0071e3]" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
            <span className={`size-1.5 rounded-full ${build.isBuilding ? "animate-pulse bg-[#0071e3]" : "bg-[#86868b]"}`} />
            {build.isBuilding ? "Building live" : "Draft mode"}
          </span>
          <span className="rounded-full bg-[#fff8e1] px-3 py-1.5 text-[#8d6e00]">$0.50 / build</span>
        </div>
      </header>

      <div className="grid min-h-[720px] lg:grid-cols-[minmax(320px,0.84fr)_minmax(0,1.5fr)]">
        <form onSubmit={submit} className="flex flex-col border-b border-black/[0.07] bg-[#fbfbfc] p-5 lg:border-b-0 lg:border-r lg:p-7">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Creative brief</p>
            <span className="text-[12px] text-[#86868b]">{prompt.length}/2,000</span>
          </div>

          <div className="mt-3 rounded-2xl border border-black/[0.09] bg-white p-1 shadow-sm transition-shadow focus-within:border-[#0071e3]/40 focus-within:shadow-[0_0_0_4px_rgba(0,113,227,0.10)]">
            <textarea
              value={prompt}
              required
              maxLength={2000}
              rows={7}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={build.isBuilding}
              placeholder="Describe the feeling, occasion, important details, and anything guests should know…"
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[15px] leading-6 outline-none placeholder:text-[#9b9ba1] disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-black/[0.06] px-3 py-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={build.isBuilding} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] disabled:opacity-50">
                <ImagePlus className="size-3.5" /> Add references
              </button>
              <button type="submit" disabled={!canBuild} className="inline-flex items-center gap-2 rounded-xl bg-[#0071e3] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-40">
                {build.isBuilding ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
                {build.completedEventId ? "Refine" : "Build"}
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={selectFiles} className="hidden" />

          <div className="mt-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Start from an idea</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button key={example.label} type="button" disabled={build.isBuilding} onClick={() => chooseExample(example)} className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] font-medium text-[#4d4d52] transition hover:border-black/[0.16] hover:bg-[#f5f5f7] disabled:opacity-50">
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-2xl border border-black/[0.07] bg-white p-4">
            <div className="flex items-center gap-2"><Palette className="size-4 text-[#0071e3]" /><p className="text-[13px] font-semibold">Visual direction</p></div>
            <div className="flex flex-wrap gap-2">
              {moods.map((item) => (
                <button key={item} type="button" onClick={() => setMood((current) => (current === item ? null : item))} disabled={build.isBuilding} className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition ${mood === item ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#626267] hover:bg-[#e9e9ec]"}`}>
                  {item}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-[#f7f7f8] px-3 py-2.5 text-[12px] text-[#6e6e73] focus-within:ring-2 focus-within:ring-[#0071e3]/15">
              <span className="shrink-0">{previewHost}/</span>
              <input value={activeSlug} required onChange={(event) => { setSlugEdited(true); setSlug(normalizeSlugInput(event.target.value)); }} disabled={build.isBuilding} className="min-w-0 flex-1 bg-transparent font-medium text-[#1d1d1f] outline-none" placeholder="your-event" />
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-black/[0.12] bg-white p-3">
              <div className="flex items-center justify-between"><p className="text-[12px] font-semibold">Reference images</p><span className="text-[11px] text-[#86868b]">{files.length}/4</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="group flex max-w-full items-center gap-2 rounded-lg bg-[#f5f5f7] py-1.5 pl-2.5 pr-1.5 text-[11px]"><span className="max-w-32 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="grid size-5 place-items-center rounded-md text-[#6e6e73] hover:bg-white hover:text-[#1d1d1f]" aria-label={`Remove ${file.name}`}><X className="size-3" /></button></div>)}
              </div>
            </div>
          )}

          <div className="mt-auto pt-5">
            {build.error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-[12px] leading-5 text-red-600" role="alert">{build.error === "ai_credit_limit_reached" ? "Your current build credit is used. Publish this site to unlock another $5." : build.error}</p>}
            <p className="flex items-center gap-2 text-[11px] leading-4 text-[#86868b]"><Wand2 className="size-3.5 shrink-0" /> Every build creates a new reviewable version. Nothing is published until you choose to launch.</p>
          </div>
        </form>

        <section className="relative min-w-0 bg-[#ececf1] p-4 sm:p-6 lg:p-7">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Live canvas</p><p className="mt-1 text-[13px] text-[#4d4d52]">{build.statusMessage}</p></div>
            <div className="flex rounded-xl border border-black/[0.08] bg-white p-1 shadow-sm">
              <button type="button" onClick={() => setDevice("desktop")} className={`grid size-8 place-items-center rounded-lg ${device === "desktop" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"}`} aria-label="Desktop preview"><Monitor className="size-4" /></button>
              <button type="button" onClick={() => setDevice("mobile")} className={`grid size-8 place-items-center rounded-lg ${device === "mobile" ? "bg-[#1d1d1f] text-white" : "text-[#6e6e73]"}`} aria-label="Mobile preview"><Smartphone className="size-4" /></button>
            </div>
          </div>

          <div className={`mx-auto mt-5 overflow-hidden rounded-[1.5rem] border border-black/[0.12] bg-white shadow-[0_18px_50px_rgba(27,31,43,0.16)] transition-[max-width] duration-500 ${device === "mobile" ? "max-w-[390px]" : "max-w-4xl"}`}>
            <div className="flex items-center gap-2 border-b border-black/[0.07] bg-[#fafafa] px-4 py-3"><span className="size-2 rounded-full bg-[#ff5f57]"/><span className="size-2 rounded-full bg-[#febc2e]"/><span className="size-2 rounded-full bg-[#28c840]"/><span className="ml-2 truncate rounded-md bg-white px-2.5 py-1 text-[10px] text-[#74747a] ring-1 ring-black/[0.05]">{previewHost}/{previewSlug}</span></div>
            <AnimatePresence mode="wait">
              {build.previewConfig && palette ? (
                <motion.div key={build.previewConfig.title} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="min-h-[535px] p-5 sm:p-8" style={{ ...palette.cssVars, background: palette.background, color: palette.text }}>
                  <div className="mx-auto max-w-lg">
                    <div className="overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/45 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] backdrop-blur">
                      {imageUrl ? <img src={imageUrl} alt="Event visual" className="mb-6 aspect-[16/9] w-full rounded-[1.15rem] object-cover" /> : null}
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-60">{build.previewConfig.eventType}</p>
                      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{build.previewConfig.title}</h2>
                      <p className="mt-4 max-w-md text-[14px] leading-6 opacity-70">{build.previewConfig.subtitle}</p>
                      <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium"><span className="rounded-full bg-white/60 px-3 py-1.5">{build.previewConfig.date}</span><span className="rounded-full bg-white/60 px-3 py-1.5">{build.previewConfig.venueName}</span></div>
                    </div>
                    <div className="mt-7 grid gap-2 sm:grid-cols-3">{build.previewConfig.schedule.slice(0, 3).map((item) => <div key={`${item.title}-${item.time}`} className="rounded-2xl border border-white/60 bg-white/45 p-3 backdrop-blur"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-[11px] opacity-60">{item.time}</p></div>)}</div>
                    <div className="mt-5 rounded-2xl border border-white/60 bg-white/40 p-4 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60">Guest RSVP</p><p className="mt-2 text-[12px] opacity-70">A secure response form is included with every published site.</p></div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[535px] place-items-center bg-[radial-gradient(circle_at_center,_#fff_0,_#f8f8fa_68%)] p-8 text-center">
                  <div className="max-w-xs">{build.isBuilding ? <Loader2 className="mx-auto size-8 animate-spin text-[#0071e3]" /> : <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e8f3ff] text-[#0071e3]"><Sparkles className="size-5" /></div>}<p className="mt-5 text-[15px] font-semibold">{build.isBuilding ? "Your agent is shaping the first version" : "Your site will take shape here"}</p><p className="mt-2 text-[13px] leading-5 text-[#6e6e73]">{build.isBuilding ? "You can keep an eye on the build as each step completes." : "Write a short creative brief, then let the agent create a polished starting point."}</p></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-black/[0.07] bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className={`grid size-7 place-items-center rounded-full ${build.isBuilding ? "bg-[#e8f3ff] text-[#0071e3]" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>{build.isBuilding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}</div><p className="text-[13px] font-semibold">Agent activity</p></div><span className="text-[12px] font-semibold tabular-nums text-[#0071e3]">{build.progressPercent}%</span></div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><motion.div className="h-full rounded-full bg-[#0071e3]" animate={{ width: `${build.progressPercent}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">{steps.slice(Math.max(0, steps.findIndex((step) => step.id === build.currentStep) - 1), Math.max(3, steps.findIndex((step) => step.id === build.currentStep) + 2)).map((step) => { const state = stepState(step.id, build.currentStep); return <div key={step.id} className={`rounded-xl px-3 py-2 ${state === "active" ? "bg-[#f0f7ff]" : "bg-[#f7f7f8]"}`}><div className="flex items-center gap-2 text-[12px] font-semibold">{state === "done" ? <Check className="size-3.5 text-[#0071e3]" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin text-[#0071e3]" /> : <Circle className="size-3.5 text-[#babac0]" />}{step.label}</div><p className="mt-1 pl-5 text-[10px] text-[#86868b]">{step.detail}</p></div>; })}</div>
          </div>

          {build.completedEventId && !build.isBuilding && <div className="mx-auto mt-4 flex max-w-4xl flex-wrap gap-2"><a href={publicSlugPath(previewSlug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[13px] font-semibold hover:bg-[#f7f7f8]"><ExternalLink className="size-3.5" /> Open preview</a>{variant === "app" ? <button type="button" onClick={() => { router.push(`/app/events/${build.completedEventId}`); router.refresh(); }} className="rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">Review & publish</button> : <Link href={`/login?next=${encodeURIComponent(`/app/events/${build.completedEventId}`)}`} className="rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">Sign in to manage</Link>}</div>}
        </section>
      </div>
    </div>
  );
}
