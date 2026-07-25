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
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildProgressStep } from "@/lib/agent/progress";
import { resolveEventPalette } from "@/lib/event-theme";
import { enrichBriefWithIntake, intakeQuestionsForBrief, type IntakeAnswers } from "@/lib/agent/intake";
import { publicSiteHost, publicSlugPath } from "@/lib/public-url";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import { useBuildJob } from "@/hooks/use-build-job";
import { VenueSearchInput } from "@/components/venue-search-input";

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

type SiteBuildStudioProps = {
  initialPrompt?: string;
  initialTemplate?: string;
  variant?: "home" | "app" | "studio";
  fullBleed?: boolean;
};

function stepState(step: BuildProgressStep, current: BuildProgressStep) {
  const currentIndex = steps.findIndex((item) => item.id === current);
  const index = steps.findIndex((item) => item.id === step);
  if (current === "error") return "pending";
  return index < currentIndex ? "done" : index === currentIndex ? "active" : "pending";
}

export function SiteBuildStudio({ initialPrompt, initialTemplate, variant = "app", fullBleed = false }: SiteBuildStudioProps) {
  const router = useRouter();
  const { state: build, startBuild, resumeStoredJob } = useBuildJob();
  const seed = examples.find((example) => example.label.toLowerCase() === initialTemplate)?.prompt ?? "";
  const [prompt, setPrompt] = useState(initialPrompt ?? seed);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [mood, setMood] = useState<string | null>(examples.find((example) => example.label.toLowerCase() === initialTemplate)?.mood ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [showIntake, setShowIntake] = useState(Boolean(initialPrompt));
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswers>({});
  const [intakeStep, setIntakeStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intakeRef = useRef<HTMLDivElement>(null);
  const previewHost = publicSiteHost();
  const suggestedSlug = normalizeSlugInput(suggestSlug(prompt) || "");
  const activeSlug = slugEdited ? slug : suggestedSlug;
  const palette = useMemo(() => (build.previewConfig ? resolveEventPalette(build.previewConfig) : null), [build.previewConfig]);
  const localPreviewImage = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : undefined), [files]);
  const imageUrl = build.previewConfig?.heroImageUrl ?? localPreviewImage;
  const intakeQuestions = useMemo(() => intakeQuestionsForBrief(prompt), [prompt]);
  useEffect(() => {
    void resumeStoredJob();
  }, [resumeStoredJob]);

  useEffect(() => {
    return () => {
      if (localPreviewImage) URL.revokeObjectURL(localPreviewImage);
    };
  }, [localPreviewImage]);

  useEffect(() => {
    if (showIntake) intakeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [intakeStep, showIntake]);

  function chooseExample(example: (typeof examples)[number]) {
    setPrompt(example.prompt);
    setMood(example.mood);
    setSlugEdited(false);
    setShowIntake(false);
    setIntakeAnswers({});
    setIntakeStep(0);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const images = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...images].slice(0, 4));
    event.target.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!build.completedEventId && !showIntake) {
      setShowIntake(true);
      return;
    }
    if (!build.completedEventId && intakeStep < intakeQuestions.length - 1) {
      setIntakeStep((current) => Math.min(current + 1, intakeQuestions.length - 1));
      return;
    }

    const form = new FormData();
    form.set("prompt", enrichBriefWithIntake(prompt, intakeAnswers));
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
    <div className={`overflow-hidden bg-[#151515] text-[#f5f5f5] ${fullBleed ? "min-h-[100svh] rounded-none border-0 shadow-none lg:h-[100svh]" : "rounded-2xl border border-white/10 shadow-[0_28px_100px_rgba(0,0,0,0.26)]"}`}>
      <header className="flex min-h-12 flex-col gap-3 border-b border-white/10 bg-[#1a1a1a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-7 place-items-center rounded-lg bg-[#8b5cf6] text-white shadow-lg shadow-violet-950/30"><Sparkles className="size-3.5" /></div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight">Eventloom Studio</p>
            <p className="text-[11px] text-[#9c9ca2]">{build.isBuilding ? "Agent is building your experience" : build.completedEventId ? "Draft ready to review" : "New event workspace"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 ${build.isBuilding ? "border-violet-400/25 bg-violet-400/10 text-violet-200" : "border-white/10 bg-white/[0.04] text-[#b7b7bc]"}`}>
            <span className={`size-1.5 rounded-full ${build.isBuilding ? "animate-pulse bg-violet-300" : "bg-[#77777e]"}`} />
            {build.isBuilding ? "Creating" : "Workspace"}
          </span>
          <span className="rounded-md bg-[#1677ff] px-2.5 py-1.5 text-white">$0.50 / build</span>
        </div>
      </header>

      <div className={`grid min-h-[760px] lg:min-h-0 lg:grid-cols-[minmax(330px,0.72fr)_minmax(0,1.5fr)] ${fullBleed ? "lg:h-[calc(100svh-49px)]" : "lg:h-[calc(100vh-76px)]"}`}>
        <form onSubmit={submit} className="flex min-h-[760px] flex-col border-b border-white/10 bg-[#191919] p-4 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9a9ae]">Agent conversation</p>
            <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-[#8f8f96]">{prompt.length}/2,000</span>
          </div>

          {prompt.trim() ? <div className="mt-5 rounded-xl bg-[#273d59] px-3.5 py-3 text-[13px] leading-5 text-[#e8efff]">{prompt}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 px-3.5 py-3 text-[12px] text-[#85858d]">Describe an event and the agent will turn it into a custom website.</div>}
          <div className="mt-4 rounded-xl border border-white/10 bg-[#202020] p-1 transition-shadow focus-within:border-violet-400/60 focus-within:ring-2 focus-within:ring-violet-400/15">
            <textarea
              value={prompt}
              required
              maxLength={2000}
              rows={7}
              onChange={(event) => {
                setPrompt(event.target.value);
                setShowIntake(false);
                setIntakeAnswers({});
                setIntakeStep(0);
              }}
              disabled={build.isBuilding}
              placeholder="Describe the feeling, occasion, important details, and anything guests should know…"
              className="w-full resize-none rounded-lg bg-transparent px-3 py-2.5 text-[13px] leading-5 text-white outline-none placeholder:text-[#85858d] disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-white/[0.08] px-2 py-1.5">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={build.isBuilding} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-[#a8a8af] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50">
                <ImagePlus className="size-3.5" /> Add references
              </button>
              <button type="submit" disabled={!canBuild} className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#9b72ff] disabled:cursor-not-allowed disabled:opacity-40">
                {build.isBuilding ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
                {build.completedEventId ? "Refine" : showIntake ? intakeStep < intakeQuestions.length - 1 ? "Next question" : "Build site" : "Continue"}
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={selectFiles} className="hidden" />

          {showIntake && !build.completedEventId ? (
                <div ref={intakeRef} className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] p-3">
                  <p className="text-[12px] font-semibold text-white">A few details before we build</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#c3b5e9]">Answer what you know. We will clearly mark anything you skip as to be announced—never make it up.</p>
                  <div className="mt-4 space-y-3">
                    {intakeQuestions.map((question, index) => index === intakeStep ? (
                      <div key={question.id} className="block">
                        <span className="block text-[11px] font-semibold text-[#eeeeef]">{question.label}</span>
                        <span className="mt-0.5 block text-[10px] text-[#aaa5b8]">{question.hint}</span>
                        {question.id === "venue" ? (
                          <VenueSearchInput
                            value={intakeAnswers.venue ?? ""}
                            onChange={(value) => setIntakeAnswers((current) => ({ ...current, venue: value }))}
                            disabled={build.isBuilding}
                          />
                        ) : question.input === "select" ? (
                          <select
                            aria-label={question.label}
                            value={intakeAnswers[question.id] ?? ""}
                            onChange={(event) => setIntakeAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                            disabled={build.isBuilding}
                            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#181818] px-3 py-2 text-[12px] text-white outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
                          >
                            <option value="">Choose one…</option>
                            {question.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input
                            aria-label={question.label}
                            type={question.input ?? "text"}
                            value={intakeAnswers[question.id] ?? ""}
                            onChange={(event) => setIntakeAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                            disabled={build.isBuilding}
                            placeholder={question.placeholder}
                            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#181818] px-3 py-2 text-[12px] text-white outline-none placeholder:text-[#777780] focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
                          />
                        )}
                      </div>
                    ) : null)}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-violet-300/15 pt-3">
                    <span className="text-[10px] text-[#aaa5b8]">Question {intakeStep + 1} of {intakeQuestions.length}</span>
                    {intakeStep === intakeQuestions.length - 1 ? (
                      <button type="submit" disabled={!canBuild} className="rounded-md bg-violet-500 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Build site</button>
                    ) : (
                      <button type="button" onClick={() => setIntakeStep((current) => Math.min(current + 1, intakeQuestions.length - 1))} className="rounded-md bg-violet-500 px-2.5 py-1.5 text-[10px] font-semibold text-white">Next question →</button>
                    )}
                  </div>
                </div>
          ) : null}

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9a9ae]">Try an idea</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button key={example.label} type="button" disabled={build.isBuilding} onClick={() => chooseExample(example)} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-[#c5c5ca] transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50">
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 rounded-xl border border-white/10 bg-[#202020] p-3">
            <div className="flex items-center gap-2"><Palette className="size-4 text-violet-300" /><p className="text-[12px] font-semibold">Visual direction</p></div>
            <div className="flex flex-wrap gap-2">
              {moods.map((item) => (
                <button key={item} type="button" onClick={() => setMood((current) => (current === item ? null : item))} disabled={build.isBuilding} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium capitalize transition ${mood === item ? "bg-violet-500 text-white" : "bg-white/[0.06] text-[#b8b8bf] hover:bg-white/[0.1]"}`}>
                  {item}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#171717] px-3 py-2 text-[11px] text-[#8f8f96] focus-within:ring-2 focus-within:ring-violet-400/20">
              <span className="shrink-0">{previewHost}/</span>
              <input value={activeSlug} required onChange={(event) => { setSlugEdited(true); setSlug(normalizeSlugInput(event.target.value)); }} disabled={build.isBuilding} className="min-w-0 flex-1 bg-transparent font-medium text-white outline-none" placeholder="your-event" />
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between"><p className="text-[11px] font-semibold">Reference images</p><span className="text-[10px] text-[#85858d]">{files.length}/4</span></div>
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((file, index) => <div key={`${file.name}-${file.size}-${index}`} className="group flex max-w-full items-center gap-2 rounded-md bg-white/[0.08] py-1.5 pl-2.5 pr-1.5 text-[10px]"><span className="max-w-32 truncate">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))} className="grid size-5 place-items-center rounded-md text-[#a0a0a8] hover:bg-white/10 hover:text-white" aria-label={`Remove ${file.name}`}><X className="size-3" /></button></div>)}
              </div>
            </div>
          )}

          <div className="mt-auto pt-5">
            {build.error && <p className="mb-3 rounded-lg bg-red-400/10 px-3 py-2.5 text-[11px] leading-5 text-red-300" role="alert">{build.error === "ai_credit_limit_reached" ? "Your current build credit is used. Publish this site to unlock another $5." : build.error}</p>}
            <p className="flex items-center gap-2 text-[10px] leading-4 text-[#85858d]"><Wand2 className="size-3.5 shrink-0 text-violet-300" /> Every build creates a new reviewable version. Nothing is published until you choose to launch.</p>
          </div>
        </form>

        <section className="relative min-w-0 bg-[#111111] p-3 sm:p-4 lg:overflow-hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b7b7bd]">Canvas</p><p className="mt-1 text-[11px] text-[#85858d]">{build.statusMessage}</p></div>
            <div className="flex rounded-md border border-white/10 bg-white/[0.04] p-1">
              <button type="button" onClick={() => setDevice("desktop")} className={`grid size-7 place-items-center rounded ${device === "desktop" ? "bg-white/15 text-white" : "text-[#85858d]"}`} aria-label="Desktop preview"><Monitor className="size-3.5" /></button>
              <button type="button" onClick={() => setDevice("mobile")} className={`grid size-7 place-items-center rounded ${device === "mobile" ? "bg-white/15 text-white" : "text-[#85858d]"}`} aria-label="Mobile preview"><Smartphone className="size-3.5" /></button>
            </div>
          </div>

          <div className={`mx-auto mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#202020] shadow-[0_18px_50px_rgba(0,0,0,0.38)] transition-[max-width] duration-500 ${device === "mobile" ? "max-w-[390px]" : "max-w-5xl"}`}>
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#191919] px-3 py-2"><span className="size-2 rounded-full bg-[#ff5f57]"/><span className="size-2 rounded-full bg-[#febc2e]"/><span className="size-2 rounded-full bg-[#28c840]"/><span className="ml-2 truncate rounded bg-black/20 px-2 py-1 text-[10px] text-[#a0a0a7]">{previewHost}/{previewSlug}</span></div>
            <AnimatePresence mode="wait">
              {build.completedEventId ? (
                <motion.iframe
                  key={`site-${build.completedEventId}`}
                  title="Generated event site preview"
                  src={publicSlugPath(previewSlug)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[650px] w-full bg-white"
                />
              ) : build.previewConfig && palette ? (
                <motion.div key={build.previewConfig.title} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="min-h-[590px] p-5 sm:p-8" style={{ ...palette.cssVars, background: palette.background, color: palette.text }}>
                  <div className="mx-auto max-w-lg">
                    <div className="overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/45 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.10)] backdrop-blur">
                      {imageUrl ? <Image unoptimized src={imageUrl} alt="Event visual" width={1200} height={675} className="mb-6 aspect-[16/9] w-full rounded-[1.15rem] object-cover" /> : null}
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
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[590px] place-items-center bg-[#202020] p-8 text-center">
                  <div className="max-w-xs">{build.isBuilding ? <Loader2 className="mx-auto size-8 animate-spin text-violet-300" /> : <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-300"><Sparkles className="size-5" /></div>}<p className="mt-5 text-[14px] font-semibold text-white">{build.isBuilding ? "Your agent is shaping the first version" : "Your site will take shape here"}</p><p className="mt-2 text-[12px] leading-5 text-[#8e8e96]">{build.isBuilding ? "You can watch as each phase completes." : "Send a creative brief to start your event workspace."}</p></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mx-auto mt-4 max-w-5xl rounded-xl border border-white/10 bg-[#191919] p-3">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className={`grid size-6 place-items-center rounded ${build.isBuilding ? "bg-violet-400/15 text-violet-300" : "bg-white/[0.06] text-[#96969d]"}`}>{build.isBuilding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}</div><p className="text-[11px] font-semibold text-white">Build activity</p></div><span className="text-[11px] font-semibold tabular-nums text-violet-300">{build.progressPercent}%</span></div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]"><motion.div className="h-full rounded-full bg-violet-400" animate={{ width: `${build.progressPercent}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">{steps.slice(Math.max(0, steps.findIndex((step) => step.id === build.currentStep) - 1), Math.max(3, steps.findIndex((step) => step.id === build.currentStep) + 2)).map((step) => { const state = stepState(step.id, build.currentStep); return <div key={step.id} className={`rounded-lg px-2.5 py-2 ${state === "active" ? "bg-violet-400/10" : "bg-white/[0.04]"}`}><div className="flex items-center gap-2 text-[11px] font-semibold text-[#e6e6e8]">{state === "done" ? <Check className="size-3.5 text-violet-300" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin text-violet-300" /> : <Circle className="size-3.5 text-[#606069]" />}{step.label}</div><p className="mt-1 pl-5 text-[10px] text-[#888890]">{step.detail}</p></div>; })}</div>
          </div>

          {build.completedEventId && !build.isBuilding && <div className="mx-auto mt-4 flex max-w-4xl flex-wrap gap-2"><a href={publicSlugPath(previewSlug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-[13px] font-semibold hover:bg-[#f7f7f8]"><ExternalLink className="size-3.5" /> Open preview</a>{variant === "app" ? <button type="button" onClick={() => { router.push(`/app/events/${build.completedEventId}`); router.refresh(); }} className="rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">Review & publish</button> : <Link href={`/login?next=${encodeURIComponent(`/app/events/${build.completedEventId}`)}`} className="rounded-xl bg-[#1d1d1f] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">Sign in to manage</Link>}</div>}
        </section>
      </div>
    </div>
  );
}
