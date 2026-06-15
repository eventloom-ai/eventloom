"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildProgressEvent, BuildProgressStep } from "@/lib/agent/progress";
import type { EventConfig } from "@/lib/types";

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

export function SiteBuildStudio() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [currentStep, setCurrentStep] = useState<BuildProgressStep>("started");
  const [statusMessage, setStatusMessage] = useState("Describe your event to begin.");
  const [previewConfig, setPreviewConfig] = useState<EventConfig | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const progress = useMemo(() => {
    const current = stepIndex(currentStep);
    return Math.round((current / (stepOrder.length - 1)) * 100);
  }, [currentStep]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsBuilding(true);
    setCurrentStep("started");
    setStatusMessage("Starting your site build…");
    setPreviewConfig(null);
    setPreviewTemplate(null);
    setPreviewSlug(slug.trim());

    const body = new FormData();
    body.set("prompt", prompt);
    body.set("slug", slug);

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
          setPreviewTemplate(progressEvent.template);
        }

        if (progressEvent.step === "done") {
          setPreviewConfig(progressEvent.config);
          setPreviewTemplate(progressEvent.template);
          setPreviewSlug(progressEvent.slug);
          setIsBuilding(false);
          finished = true;
          window.setTimeout(() => {
            router.push(`/app/events/${progressEvent.eventId}`);
            router.refresh();
          }, 900);
          break;
        }
      }
    }

    if (!finished) {
      setIsBuilding(false);
    }
  }

  const colors = previewConfig?.theme.colors ?? ["#1f1a17", "#f7f2ed", "#6f3032", "#747d5c"];

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
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isBuilding}
            className="resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60"
            placeholder="A warm summer wedding with RSVP, schedule, and photo gallery..."
          />
        </label>

        <label className="mt-5 grid gap-2">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Link name</span>
          <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 focus-within:border-[#0071e3]/50 focus-within:bg-white">
            <span className="shrink-0 text-[14px] text-[#6e6e73]">eventloom.ai/</span>
            <input
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={isBuilding}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#6e6e73]/60 disabled:opacity-60"
              placeholder="summer-wedding"
            />
          </div>
        </label>

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
          {isBuilding ? "Building…" : "Create first version"}
        </button>
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
              eventloom.ai/{previewSlug || slug || "your-event"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {previewConfig ? (
              <motion.div
                key={previewConfig.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="p-5"
                style={{ background: colors[1] ?? "#f7f2ed", color: colors[0] ?? "#1f1a17" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                    {previewTemplate === "wedding-rsvp" ? "Wedding RSVP" : "Custom site"}
                  </span>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-[11px]">{previewConfig.eventType}</span>
                </div>

                <h3 className="mt-4 font-display text-3xl leading-tight">{previewConfig.title}</h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed opacity-80">{previewConfig.subtitle}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {colors.slice(0, 4).map((color) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>

                <div className="mt-5 grid gap-2">
                  {previewConfig.schedule.slice(0, 3).map((item, index) => (
                    <motion.div
                      key={`${item.title}-${item.time}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className="rounded-xl bg-white/65 px-3 py-2.5 text-[13px]"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="opacity-70">{item.time}</p>
                    </motion.div>
                  ))}
                </div>

                <p className="mt-4 text-[13px] opacity-75">
                  {previewConfig.date} · {previewConfig.venueName}
                </p>
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
