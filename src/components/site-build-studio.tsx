"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, Eye, Globe2, Loader2, WandSparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SampleInvitationTemplate } from "@/components/sample-invitation-template";
import type { BuildProgressEvent, BuildProgressStep } from "@/lib/agent/progress";
import { resolveEventPalette } from "@/lib/event-theme";
import type { EventConfig } from "@/lib/types";

type StepState = "pending" | "active" | "done";
type MoodId = "blush" | "navy" | "gold" | "lavender" | "forest" | "sunset";
type LayoutId = "story" | "modern" | "simple";

const stepOrder: BuildProgressStep[] = ["started", "planning", "planned", "generating", "saving", "done"];

const stepLabels: Record<BuildProgressStep, string> = {
  started: "Start",
  planning: "Plan",
  planned: "Preview",
  generating: "Write",
  saving: "Save",
  done: "Ready",
  error: "Error",
};

const moodOptions: Array<{ id: MoodId; label: string; colors: [string, string, string, string] }> = [
  { id: "blush", label: "Soft", colors: ["#211715", "#fbf3ef", "#b46d6f", "#8b7a6f"] },
  { id: "navy", label: "Sharp", colors: ["#101827", "#f5f7fb", "#38598f", "#7b879f"] },
  { id: "gold", label: "Fancy", colors: ["#1d1710", "#fff8ea", "#b9852f", "#8b7658"] },
  { id: "lavender", label: "Dreamy", colors: ["#221827", "#fbf4ff", "#9168b7", "#8a7c91"] },
  { id: "forest", label: "Natural", colors: ["#101c16", "#f4f8f1", "#427357", "#7f8d78"] },
  { id: "sunset", label: "Bright", colors: ["#24130f", "#fff4ec", "#df6f45", "#9a7a6c"] },
];

const layoutOptions: Array<{ id: LayoutId; label: string; instruction: string }> = [
  { id: "story", label: "Elegant", instruction: "Make it feel like an elegant invitation with warm story sections." },
  { id: "modern", label: "Modern", instruction: "Make it feel clean, bold, editorial, and easy to scan on a phone." },
  { id: "simple", label: "Simple", instruction: "Keep it simple, calm, and very clear for guests of all ages." },
];

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
      // Ignore malformed stream chunks.
    }
  }

  return { events, remainder };
}

function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug;
}

function titleFromPrompt(prompt: string) {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Your Event";

  return cleaned
    .split(/[,.]/)[0]
    .replace(/^an?\s+/i, "")
    .slice(0, 58)
    .trim();
}

function formatDisplayDate(date: string) {
  if (!date) return "Date coming soon";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function buildLiveConfig(input: {
  eventName: string;
  prompt: string;
  date: string;
  venue: string;
  deadline: string;
  mood: MoodId;
  layout: LayoutId;
}): EventConfig {
  const mood = moodOptions.find((option) => option.id === input.mood) ?? moodOptions[0];
  const layout = layoutOptions.find((option) => option.id === input.layout) ?? layoutOptions[0];
  const title = input.eventName.trim() || titleFromPrompt(input.prompt);
  const date = input.date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString().slice(0, 10);
  const venue = input.venue.trim() || "Place coming soon";

  return {
    title,
    subtitle: input.prompt.trim() || "A beautiful event page with details, directions, and guest replies in one place.",
    eventType: /wedding/i.test(`${title} ${input.prompt}`) ? "wedding" : "event",
    date: formatDisplayDate(date),
    venueName: venue,
    rsvpDeadline: input.deadline || undefined,
    rsvpFields: ["name", "attendance", "party_size", "guest_names", "note"],
    schedule: [
      { title: "Welcome", time: "First", location: venue, description: "Guests arrive and get settled." },
      { title: "Main Event", time: "Next", location: venue, description: "The main celebration begins." },
      { title: "Food and Photos", time: "After", location: venue, description: "Time for food, pictures, and conversation." },
    ],
    template: input.layout === "modern" ? "custom" : "wedding-rsvp",
    theme: {
      mood: `${mood.label.toLowerCase()} ${layout.label.toLowerCase()}`,
      colors: [...mood.colors],
      fontPairing: input.layout === "modern" ? "bold display with clean sans" : "romantic serif with clean sans",
    },
  };
}

function buildPrompt(input: {
  eventName: string;
  prompt: string;
  date: string;
  venue: string;
  deadline: string;
  mood: MoodId;
  layout: LayoutId;
}) {
  const mood = moodOptions.find((option) => option.id === input.mood) ?? moodOptions[0];
  const layout = layoutOptions.find((option) => option.id === input.layout) ?? layoutOptions[0];
  const lines = [
    input.prompt.trim() || "Create an event website.",
    "",
    "Use these exact customer choices:",
    `Event name: ${input.eventName.trim() || "Use the best name from the description"}`,
    `Date: ${input.date || "Ask the page to say date coming soon"}`,
    `Place: ${input.venue.trim() || "Place coming soon"}`,
    `RSVP deadline: ${input.deadline || "No deadline yet"}`,
    `Color feel: ${mood.label}. Palette: ${mood.colors.join(", ")}`,
    `Layout feel: ${layout.label}. ${layout.instruction}`,
    "Make the page feel custom to this event. Do not mention templates.",
  ];

  return lines.join("\n");
}

export function SiteBuildStudio() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [prompt, setPrompt] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId>("blush");
  const [selectedLayout, setSelectedLayout] = useState<LayoutId>("story");
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuildProgressStep>("started");
  const [statusMessage, setStatusMessage] = useState("Edit the details and watch the preview change.");
  const [generatedConfig, setGeneratedConfig] = useState<EventConfig | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const liveConfig = useMemo(
    () =>
      buildLiveConfig({
        eventName,
        prompt,
        date,
        venue,
        deadline,
        mood: selectedMood,
        layout: selectedLayout,
      }),
    [date, deadline, eventName, prompt, selectedLayout, selectedMood, venue],
  );

  const activeConfig = generatedConfig ?? liveConfig;
  const palette = useMemo(() => resolveEventPalette(activeConfig), [activeConfig]);
  const activeSlug = previewSlug || slug || makeSlug(eventName || prompt) || "your-event";

  const progress = useMemo(() => {
    const current = stepIndex(currentStep);
    return Math.round((current / (stepOrder.length - 1)) * 100);
  }, [currentStep]);

  function updateName(value: string) {
    setEventName(value);
    setGeneratedConfig(null);
    if (!slugEdited) {
      setSlug(makeSlug(value));
    }
  }

  function updatePrompt(value: string) {
    setPrompt(value);
    setGeneratedConfig(null);
    if (!slugEdited && !eventName.trim()) {
      setSlug(makeSlug(value));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalSlug = slug.trim() || makeSlug(eventName || prompt);
    if (!finalSlug || finalSlug.length < 3) {
      setError("Pick a short link with at least 3 letters or numbers.");
      return;
    }

    setError("");
    setIsBuilding(true);
    setCurrentStep("started");
    setStatusMessage("Starting your site build...");
    setGeneratedConfig(liveConfig);
    setPreviewSlug(finalSlug);

    const body = new FormData();
    body.set(
      "prompt",
      buildPrompt({
        eventName,
        prompt,
        date,
        venue,
        deadline,
        mood: selectedMood,
        layout: selectedLayout,
      }),
    );
    body.set("slug", finalSlug);
    body.set("publish", publishNow ? "true" : "false");
    body.set("template", selectedLayout === "modern" ? "custom" : "wedding");

    const response = await fetch("/api/events/build", {
      method: "POST",
      body,
    }).catch(() => null);

    if (!response?.ok || !response.body) {
      setIsBuilding(false);
      setError(response?.status === 401 ? "Sign in first so your event can be saved." : "We couldn't start the build. Please try again.");
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

        if (progressEvent.step === "planned" || progressEvent.step === "done") {
          setGeneratedConfig(progressEvent.config);
        }

        if (progressEvent.step === "done") {
          setPreviewSlug(progressEvent.slug);
          setIsBuilding(false);
          finished = true;
          window.setTimeout(() => {
            router.push(`/app/events/${progressEvent.eventId}`);
            router.refresh();
          }, 850);
          break;
        }
      }
    }

    if (!finished) {
      setIsBuilding(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:items-start">
      <form onSubmit={submit} className="rounded-2xl border border-black/[0.06] bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Create</p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-tight">Tell us the basics</h2>
          </div>
          <WandSparkles className="mt-1 h-5 w-5 text-[#0071e3]" strokeWidth={1.8} />
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">What is the event called?</span>
          <input
            value={eventName}
            onChange={(event) => updateName(event.target.value)}
            disabled={isBuilding}
            className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            placeholder="Maya and Omar's wedding"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-[14px] font-medium text-[#1d1d1f]">When?</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setGeneratedConfig(null);
              }}
              disabled={isBuilding}
              className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[14px] font-medium text-[#1d1d1f]">RSVP by</span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => {
                setDeadline(event.target.value);
                setGeneratedConfig(null);
              }}
              disabled={isBuilding}
              className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] outline-none transition-all focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            />
          </label>
        </div>

        <label className="mt-4 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Where?</span>
          <input
            value={venue}
            onChange={(event) => {
              setVenue(event.target.value);
              setGeneratedConfig(null);
            }}
            disabled={isBuilding}
            className="rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            placeholder="Pearl Banquet Hall"
          />
        </label>

        <label className="mt-4 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">What should the page say?</span>
          <textarea
            rows={4}
            value={prompt}
            onChange={(event) => updatePrompt(event.target.value)}
            disabled={isBuilding}
            className="resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            placeholder="A warm bilingual celebration with separate hall details, directions, and a simple RSVP."
          />
        </label>

        <div className="mt-5">
          <p className="text-[14px] font-medium text-[#1d1d1f]">Pick a feel</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {layoutOptions.map((layout) => (
              <button
                key={layout.id}
                type="button"
                disabled={isBuilding}
                onClick={() => {
                  setSelectedLayout(layout.id);
                  setGeneratedConfig(null);
                }}
                className={`rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  selectedLayout === layout.id ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]"
                }`}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[14px] font-medium text-[#1d1d1f]">Pick colors</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {moodOptions.map((mood) => (
              <button
                key={mood.id}
                type="button"
                disabled={isBuilding}
                onClick={() => {
                  setSelectedMood(mood.id);
                  setGeneratedConfig(null);
                }}
                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  selectedMood === mood.id ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]"
                }`}
              >
                <span>{mood.label}</span>
                <span className="flex -space-x-1">
                  {mood.colors.slice(1).map((color) => (
                    <span key={color} className="h-4 w-4 rounded-full border border-white/70" style={{ background: color }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Choose the link</span>
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 focus-within:border-[#0071e3]/50 focus-within:bg-white">
            <span className="shrink-0 text-[14px] text-[#6e6e73]">eventloom.ai/</span>
            <input
              required
              value={slug}
              onChange={(event) => {
                setSlug(makeSlug(event.target.value));
                setSlugEdited(true);
              }}
              disabled={isBuilding}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#6e6e73]/60 disabled:opacity-60"
              placeholder="maya-omar"
            />
          </div>
        </label>

        <label className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[#f5f5f7] px-4 py-3">
          <span>
            <span className="block text-[14px] font-medium text-[#1d1d1f]">Make the link live after building</span>
            <span className="mt-0.5 block text-[12px] text-[#6e6e73]">You can still edit it later.</span>
          </span>
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(event) => setPublishNow(event.target.checked)}
            disabled={isBuilding}
            className="h-5 w-5 accent-[#0071e3]"
          />
        </label>

        {error ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
            {error.includes("duplicate key") ? "That link name is already taken. Choose another one." : error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isBuilding || (!eventName.trim() && !prompt.trim()) || !activeSlug.trim()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] py-3.5 text-[16px] font-medium text-white transition-all hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBuilding ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          {isBuilding ? "Building..." : publishNow ? "Build and publish" : "Build draft"}
        </button>
      </form>

      <section className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">
              <Eye className="h-4 w-4" />
              Live canvas
            </p>
            <p className="mt-1 text-[15px] text-[#1d1d1f]">{statusMessage}</p>
          </div>
          <div className="flex items-center gap-3">
            {publishNow ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f]">
                <Globe2 className="h-3.5 w-3.5 text-[#0071e3]" />
                Will publish
              </span>
            ) : null}
            <div className="text-right">
              <p className="text-[24px] font-semibold tabular-nums text-[#1d1d1f]">{progress}%</p>
              <p className="text-[12px] text-[#6e6e73]">complete</p>
            </div>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
          <motion.div
            className="h-full rounded-full bg-[#0071e3]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <ol className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-6">
          {stepOrder.map((step) => {
            const state = statusFor(step, currentStep);
            return (
              <li
                key={step}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-2 text-center text-[12px] transition-colors ${
                  state === "active" ? "bg-white text-[#1d1d1f]" : "text-[#6e6e73]"
                }`}
              >
                {state === "done" ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0071e3]" strokeWidth={2.5} />
                ) : state === "active" ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#0071e3]" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 opacity-35" />
                )}
                <span className={state === "active" ? "font-medium" : ""}>{stepLabels[step]}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_18px_70px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#fbfbfd] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <p className="ms-2 truncate text-[12px] text-[#6e6e73]">eventloom.ai/{activeSlug}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeConfig.title}-${selectedMood}-${selectedLayout}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="wedding-rsvp p-4 sm:p-5"
              style={{ ...palette.cssVars, background: palette.background, color: palette.text }}
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.9fr)_minmax(0,1fr)] lg:items-start">
                <div className="mx-auto w-full max-w-sm">
                  <SampleInvitationTemplate
                    compact
                    imageAreaLabel="This area is for images."
                    title={activeConfig.title}
                    subtitle={activeConfig.subtitle}
                    date={activeConfig.date}
                  />
                </div>

                <div className="min-w-0 rounded-[1.1rem] bg-white/55 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--el-muted)]">
                    Guest view
                  </p>
                  <h3 className="mt-3 font-display text-3xl leading-tight text-[color:var(--el-text)]">{activeConfig.title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-[color:var(--el-text)]/65">{activeConfig.subtitle}</p>

                  <div className="mt-5 grid gap-2 text-[13px] text-[color:var(--el-text)]/70">
                    <p>
                      <span className="font-medium text-[color:var(--el-text)]">Date:</span> {activeConfig.date}
                    </p>
                    <p>
                      <span className="font-medium text-[color:var(--el-text)]">Place:</span> {activeConfig.venueName}
                    </p>
                    {activeConfig.rsvpDeadline ? (
                      <p>
                        <span className="font-medium text-[color:var(--el-text)]">RSVP by:</span>{" "}
                        {formatDisplayDate(activeConfig.rsvpDeadline)}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-2">
                    {activeConfig.schedule.slice(0, 3).map((item, index) => (
                      <motion.div
                        key={`${item.title}-${item.time}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3"
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
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
