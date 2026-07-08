"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Globe2, Loader2, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EventLivePreview } from "@/components/event-live-preview";
import type { EventConfig, EventRecord } from "@/lib/types";

function statusLabel(status: EventRecord["status"]) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function previewConfig(config: EventConfig, instruction: string): EventConfig {
  const trimmed = instruction.trim();
  if (!trimmed) return config;

  return {
    ...config,
    subtitle: trimmed.length > 180 ? `${trimmed.slice(0, 177)}...` : trimmed,
  };
}

export function EventEditor({ event }: { event: EventRecord }) {
  const [currentEvent, setCurrentEvent] = useState(event);
  const [instruction, setInstruction] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState("Type changes on the left. The canvas reacts as you write.");
  const [error, setError] = useState("");

  const activeConfig = useMemo(
    () => previewConfig(currentEvent.config, instruction),
    [currentEvent.config, instruction],
  );
  const previewEvent = useMemo(() => ({ ...currentEvent, config: activeConfig }), [activeConfig, currentEvent]);

  async function regenerate() {
    const prompt = instruction.trim();
    if (!prompt) {
      setError("Tell Eventloom what to change first.");
      return;
    }

    setError("");
    setMessage("Updating the canvas...");
    setIsGenerating(true);

    const response = await fetch(`/api/events/${currentEvent.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    }).catch(() => null);

    setIsGenerating(false);

    if (!response?.ok) {
      setError("The update did not finish. Try a smaller change.");
      setMessage("Nothing was changed.");
      return;
    }

    const result = (await response.json().catch(() => null)) as { config?: EventConfig } | null;
    if (!result?.config) {
      setError("The update finished, but the page did not return a new design.");
      setMessage("Nothing was changed.");
      return;
    }

    setCurrentEvent((value) => ({ ...value, config: result.config! }));
    setInstruction("");
    setMessage("Canvas updated. Keep typing to change more.");
  }

  async function publish() {
    setError("");
    setMessage("Publishing your link...");
    setIsPublishing(true);

    const response = await fetch(`/api/events/${currentEvent.id}/publish-site`, {
      method: "POST",
    }).catch(() => null);

    setIsPublishing(false);

    if (!response?.ok) {
      setError("Could not publish yet. Try again.");
      setMessage("Still saved as a draft.");
      return;
    }

    setCurrentEvent((value) => ({ ...value, status: "published", rsvp_open: true }));
    setMessage("Published. Your link is live.");
  }

  return (
    <div className="grid gap-4 xl:h-[calc(100vh-13.5rem)] xl:min-h-[560px] xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
      <section className="flex min-h-0 flex-col rounded-2xl border border-black/[0.06] bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Editor</p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-tight">Keep changing it</h2>
          </div>
          <Sparkles className="mt-1 h-5 w-5 text-[#0071e3]" strokeWidth={1.8} />
        </div>

        <div className="mt-5 rounded-xl bg-[#f5f5f7] px-4 py-3 text-[13px] text-[#6e6e73]">
          <p>
            Status: <span className="font-medium text-[#1d1d1f]">{statusLabel(currentEvent.status)}</span>
            {currentEvent.rsvp_open ? " · Guest replies open" : " · Guest replies closed"}
          </p>
          <p className="mt-1 truncate">eventloom.ai/{currentEvent.slug}</p>
        </div>

        <label className="mt-5 grid min-h-0 gap-2 xl:flex xl:flex-1 xl:flex-col">
          <span className="text-[14px] font-medium text-[#1d1d1f]">Tell Eventloom what to change</span>
          <textarea
            rows={8}
            value={instruction}
            onChange={(event) => {
              setInstruction(event.target.value);
              setError("");
              setMessage(event.target.value.trim() ? "Previewing your words on the canvas." : "Type changes on the left. The canvas reacts as you write.");
            }}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void regenerate();
              }
            }}
            disabled={isGenerating}
            className="min-h-[180px] resize-none rounded-xl border border-black/[0.08] bg-[#fbfbfd] px-4 py-3.5 text-[16px] leading-relaxed outline-none transition-all placeholder:text-[#6e6e73]/60 focus:border-[#0071e3]/50 focus:bg-white disabled:opacity-60 xl:flex-1"
            placeholder="Make it more elegant, add a dinner schedule, mention parking, change the colors to navy and gold..."
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={isGenerating || !instruction.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Update canvas
          </button>

          {currentEvent.status === "published" ? (
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-5 py-3 text-[15px] font-medium transition-colors hover:bg-[#f5f5f7]"
              href={`/${currentEvent.slug}`}
            >
              <Globe2 className="h-4 w-4" />
              Open link
            </Link>
          ) : (
            <button
              type="button"
              onClick={publish}
              disabled={isPublishing}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-5 py-3 text-[15px] font-medium transition-colors hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
              Publish
            </button>
          )}
        </div>

        <p className="mt-4 text-[13px] leading-6 text-[#6e6e73]">
          Tip: press Command Enter to update the saved design.
        </p>
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-4 md:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wide text-[#6e6e73]">Live canvas</p>
            <p className="mt-1 text-[15px] text-[#1d1d1f]">{message}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f]">
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0071e3]" /> : <Check className="h-3.5 w-3.5 text-[#0071e3]" />}
            {isGenerating ? "Building" : "Live preview"}
          </span>
        </div>

        <div className="mt-4 flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-black/[0.08] bg-white shadow-[0_18px_70px_rgba(0,0,0,0.08)] xl:min-h-0">
          <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#fbfbfd] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <p className="ms-2 truncate text-[12px] text-[#6e6e73]">eventloom.ai/{currentEvent.slug}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeConfig.title}-${activeConfig.subtitle}-${activeConfig.theme.colors.join("-")}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="min-h-full flex-1 overflow-auto bg-white"
            >
              <div
                onSubmitCapture={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <EventLivePreview event={previewEvent} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
