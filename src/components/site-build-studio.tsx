"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SampleInvitationTemplate } from "@/components/sample-invitation-template";
import type { BuildProgressEvent, BuildProgressStep } from "@/lib/agent/progress";
import { resolveEventPalette } from "@/lib/event-theme";
import { publicSiteHost, publicSlugPath } from "@/lib/public-url";
import { normalizeSlugInput, suggestSlug } from "@/lib/slug-suggest";
import type { EventConfig } from "@/lib/types";

export const examplePrompts = [
  {
    id: "wedding",
    label: "Wedding",
    prompt:
      "A luxury bilingual wedding site with guest replies, separate men's and women's hall details, and a soft blush design.",
    mood: "blush" as const,
  },
  {
    id: "birthday",
    label: "Birthday",
    prompt: "A modern birthday party page with a photo gallery, guest replies, dress code, and a bold colorful look.",
    mood: "sunset" as const,
  },
  {
    id: "engagement",
    label: "Engagement",
    prompt:
      "An elegant engagement site with family wording, Arabic and English text, schedule, location details, and guest replies.",
    mood: "gold" as const,
  },
] as const;

type StepState = "pending" | "active" | "done";

const stepOrder: BuildProgressStep[] = ["started", "planning", "planned", "generating", "saving", "done"];

const stepLabels: Record<BuildProgressStep, string> = {
  started: "Initialize",
  planning: "Plan site",
  planned: "Apply template",
  generating: "Generate content",
  saving: "Save to account",
  done: "Ready",
  error: "Error",
};

const moodOptions = ["blush", "navy", "gold", "lavender", "forest", "sunset"] as const;

type SiteBuildStudioProps = {
  initialPrompt?: string;
  initialTemplate?: string;
  variant?: "home" | "app";
};

function stepIndex(step: BuildProgressStep) {
  const index = stepOrder.indexOf(step);
  return index === -1 ? 0 : index;
}

function statusFor(step: BuildProgressStep, current: BuildProgressStep): StepState {
  const currentIndex = stepIndex(current);
  const stepIdx = stepIndex(step);
  if (stepIdx < currentIndex) return "done";
  if (stepIdx === currentIndex) return "active";
  return "pending";
}

function parseSseChunk(buffer: string, chunk: string) {
  const text = buffer + chunk;
  const events: BuildProgressEvent[] = [];
  const parts = text.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .find((entry) => entry.startsWith("data: "));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as BuildProgressEvent);
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, remainder };
}

function templateDefaults(template?: string) {
  const example = examplePrompts.find((item) => item.id === template);
  return {
    prompt: example?.prompt ?? "",
    activeExample: example?.label ?? null,
    mood: example?.mood ?? null,
  };
}

export function SiteBuildStudio({ initialPrompt, initialTemplate, variant = "app" }: SiteBuildStudioProps) {
  const router = useRouter();
  const defaults = useMemo(() => templateDefaults(initialTemplate), [initialTemplate]);
  const [prompt, setPrompt] = useState(initialPrompt ?? defaults.prompt);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [activeExample, setActiveExample] = useState<string | null>(defaults.activeExample);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuildProgressStep>("started");
  const [statusMessage, setStatusMessage] = useState("Describe your event to begin.");
  const [previewConfig, setPreviewConfig] = useState<EventConfig | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [completedEventId, setCompletedEventId] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(defaults.mood);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewHost = publicSiteHost();

  useEffect(() => {
    if (slugEdited) return;
    const suggested = suggestSlug(prompt);
    if (suggested) {
      setSlug(suggested);
    }
  }, [prompt, slugEdited]);

  const localPreviewImage = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files]);

  useEffect(() => {
    return () => {
      if (localPreviewImage) {
        URL.revokeObjectURL(localPreviewImage);
      }
    };
  }, [localPreviewImage]);

  const progress = useMemo(() => {
    const current = stepIndex(currentStep);
    return Math.round((current / (stepOrder.length - 1)) * 100);
  }, [currentStep]);

  function selectExample(example: (typeof examplePrompts)[number]) {
    setPrompt(example.prompt);
    setActiveExample(example.label);
    setSelectedMood(example.mood);
    setSlugEdited(false);
    setError("");
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setFiles((current) => [...current, ...nextFiles].slice(0, 8));
    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsBuilding(true);
    setCompletedEventId(null);
    setCurrentStep("started");
    setStatusMessage("Starting your site build…");
    setPreviewConfig(null);
    setPreviewSlug(slug.trim());

    const body = new FormData();
    body.set("prompt", prompt.trim());
    body.set("slug", slug.trim());
    if (selectedMood) {
      body.set("mood", selectedMood);
    }
    if (initialTemplate === "wedding") {
      body.set("template", "wedding");
    }
    if (completedEventId) {
      body.set("event_id", completedEventId);
    }

    const response = await fetch("/api/events/build", {
      method: "POST",
      body,
    }).catch(() => null);

    if (!response?.ok || !response.body) {
      setIsBuilding(false);
      setError("We couldn't start the build. Please try again.");
      setCurrentStep("error");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;

      const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
      buffer = parsed.remainder;

      for (const progressEvent of parsed.events) {
        if (progressEvent.step === "error") {
          setError(progressEvent.message);
          setCurrentStep("error");
          setStatusMessage(progressEvent.message);
          setIsBuilding(false);
          finished = true;
          break;
        }

        setCurrentStep(progressEvent.step);
        setStatusMessage(progressEvent.message);

        if (progressEvent.step === "planned") {
          setPreviewConfig(progressEvent.config);
        }

        if (progressEvent.step === "done") {
          setPreviewConfig(progressEvent.config);
          setPreviewSlug(progressEvent.slug);
          setCompletedEventId(progressEvent.eventId);
          setIsBuilding(false);
          setStatusMessage("Your first version is ready. Tweak details and build again, or open the live preview.");
          finished = true;
          break;
        }
      }
    }

    if (!finished) {
      setIsBuilding(false);
    }
  }

  const palette = useMemo(() => (previewConfig ? resolveEventPalette(previewConfig) : null), [previewConfig]);
  const previewImageUrl = previewConfig?.heroImageUrl ?? localPreviewImage ?? undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-black/[0.06] bg-white p-6 md:p-7"
      >
        <p className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Your event</p>

        <label className="mt-4 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Description</span>
          <textarea
            required
            rows={5}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setActiveExample(null);
              setError("");
            }}
            disabled={isBuilding}
            className="resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            placeholder="A warm summer wedding with RSVP, schedule, and photo gallery..."
          />
        </label>

        {variant === "home" ? (
          <div className="mt-5">
            <p className="text-[13px] font-medium text-[#6e6e73]">Quick start</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examplePrompts.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  disabled={isBuilding}
                  onClick={() => selectExample(example)}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium transition-all active:scale-[0.98] ${
                    activeExample === example.label
                      ? "bg-[#1d1d1f] text-white"
                      : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]"
                  }`}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <p className="text-[14px] font-medium text-[#1d1d1f]">Color mood</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {moodOptions.map((mood) => (
              <button
                key={mood}
                type="button"
                disabled={isBuilding}
                onClick={() => setSelectedMood((current) => (current === mood ? null : mood))}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium capitalize transition-colors ${
                  selectedMood === mood
                    ? "bg-[#1d1d1f] text-white"
                    : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]"
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Your link</span>
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 focus-within:border-[#0071e3]/50 focus-within:bg-white">
            <span className="shrink-0 text-[14px] text-[#6e6e73]">{previewHost}/</span>
            <input
              required
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(normalizeSlugInput(event.target.value));
              }}
              disabled={isBuilding}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#6e6e73]/60 disabled:opacity-60"
              placeholder="summer-wedding"
            />
          </div>
          <p className="text-[12px] text-[#6e6e73]">Short and memorable works best. You can edit this anytime before publishing.</p>
        </label>

        <div className="mt-5 rounded-xl border border-dashed border-black/[0.12] bg-[#fbfbfd] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#1d1d1f]">Photos</p>
              <p className="mt-1 text-[12px] text-[#6e6e73]">Your first photo becomes the hero invitation image.</p>
            </div>
            <button
              type="button"
              disabled={isBuilding}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f5f5f7] px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-[#ebebed] disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
              Add photos
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={selectFiles} className="hidden" />

          {files.length ? (
            <ul className="mt-3 space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[13px]"
                >
                  <span className="min-w-0 truncate text-[#1d1d1f]">
                    {index === 0 ? "Hero · " : ""}
                    {file.name}
                  </span>
                  <button
                    type="button"
                    disabled={isBuilding}
                    onClick={() => removeFile(index)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.06] hover:text-[#1d1d1f]"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
            {error.includes("duplicate key") ? "That link name is already taken. Choose another one." : error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isBuilding || !prompt.trim() || !slug.trim()}
          className="mt-6 w-full rounded-full bg-[#0071e3] py-3.5 text-[16px] font-medium text-white transition-all hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBuilding ? "Building…" : completedEventId ? "Update site" : variant === "home" ? "Create my site" : "Create first version"}
        </button>

        {completedEventId ? (
          <div className="mt-4 grid gap-2">
            <a
              href={publicSlugPath(previewSlug ?? slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-white py-3 text-[14px] font-medium transition-colors hover:bg-[#f5f5f7]"
            >
              Open live preview
            </a>
            {variant === "app" ? (
              <button
                type="button"
                onClick={() => {
                  router.push(`/app/events/${completedEventId}`);
                  router.refresh();
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#1d1d1f] py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Manage event
              </button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/app/events/${completedEventId}`)}`}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#1d1d1f] py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Sign in to manage
              </Link>
            )}
          </div>
        ) : null}
      </form>

      <section className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Build canvas</p>
            <p className="mt-1 text-[15px] text-[#1d1d1f]">{statusMessage}</p>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-semibold tabular-nums text-[#1d1d1f]">{progress}%</p>
            <p className="text-[12px] text-[#6e6e73]">complete</p>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <motion.div
            className="h-full rounded-full bg-[#0071e3]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <ol className="mt-6 grid gap-2">
          {stepOrder.map((step) => {
            const state = statusFor(step, currentStep);
            return (
              <li
                key={step}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
                  state === "active" ? "bg-white text-[#1d1d1f]" : "text-[#6e6e73]"
                }`}
              >
                {state === "done" ? (
                  <Check className="h-4 w-4 shrink-0 text-[#0071e3]" strokeWidth={2.5} />
                ) : state === "active" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0071e3]" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 opacity-35" />
                )}
                <span className={state === "active" ? "font-medium" : ""}>{stepLabels[step]}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white">
          <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#fbfbfd] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <p className="ms-2 truncate text-[12px] text-[#6e6e73]">
              {previewHost}/{previewSlug || slug || "your-event"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {previewConfig && palette ? (
              <motion.div
                key={previewConfig.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="wedding-rsvp p-5"
                style={{ ...palette.cssVars, background: palette.background, color: palette.text }}
              >
                <div className="mx-auto max-w-sm">
                  <SampleInvitationTemplate
                    compact
                    imageAreaLabel="Your photo will appear here."
                    title={previewConfig.title}
                    subtitle={previewConfig.subtitle}
                    date={previewConfig.date}
                    imageUrl={previewImageUrl}
                  />
                </div>

                <div className="mx-auto mt-6 max-w-md">
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--el-muted)]">
                    Schedule preview
                  </p>
                  <div className="mt-4 space-y-3">
                    {previewConfig.schedule.slice(0, 3).map((item, index) => (
                      <motion.div
                        key={`${item.title}-${item.time}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3 backdrop-blur-xl"
                      >
                        <p className="font-display text-xl text-[color:var(--el-accent)]">{item.title}</p>
                        <p className="mt-1 text-[12px] text-[color:var(--el-text)]/60">{item.time}</p>
                        {item.description ? (
                          <p className="mt-1 text-[12px] leading-6 text-[color:var(--el-text)]/55">{item.description}</p>
                        ) : null}
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/50 px-4 py-3 text-[12px]">
                  <span className="text-[color:var(--el-text)]/70">{previewConfig.venueName}</span>
                  <div className="flex gap-1.5">
                    {previewConfig.theme.colors.slice(0, 4).map((color) => (
                      <span
                        key={color}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid min-h-[280px] place-items-center p-8 text-center"
              >
                <div>
                  {isBuilding ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0071e3]" />
                  ) : (
                    <div className="mx-auto h-8 w-8 rounded-full border-2 border-dashed border-black/15" />
                  )}
                  <p className="mt-4 text-[14px] text-[#6e6e73]">
                    {isBuilding
                      ? "Your preview will appear here as the agent plans your site."
                      : "Start a build to see your site take shape in real time."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
