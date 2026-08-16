"use client";

import { ChevronDown, Mic, Plus } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { eventDraftEntryPath } from "@/lib/event-entry";

const eventTypes = [
  { value: "wedding", label: "Wedding", starter: "An elegant wedding celebration with a thoughtful RSVP for our guests.", placeholder: "Ask Eventloom to create a wedding site…" },
  { value: "engagement", label: "Engagement", starter: "A beautiful engagement celebration with event details and guest replies.", placeholder: "Ask Eventloom to create an engagement party site…" },
  { value: "birthday", label: "Birthday", starter: "A memorable birthday celebration with a personal event site and RSVP.", placeholder: "Ask Eventloom to create a birthday invitation…" },
  { value: "celebration", label: "Celebration", starter: "A special celebration with a custom website and simple guest RSVP.", placeholder: "Ask Eventloom to create a celebration site…" },
  { value: "corporate", label: "Corporate event", starter: "A polished corporate event page with the schedule, venue details, and attendee replies.", placeholder: "Ask Eventloom to create a corporate event page…" },
  { value: "other", label: "Something else", starter: "", placeholder: "Ask Eventloom to create an event site…" },
] as const;

const rotatingPrompts = [
  "a wedding site…",
  "a birthday invitation…",
  "a garden party site…",
  "a corporate event page…",
  "a baby shower site…",
] as const;

const promptPrefix = "Ask Eventloom to create";

type EventType = (typeof eventTypes)[number]["value"];

function initialEventType(template?: string): EventType {
  return eventTypes.some((type) => type.value === template) ? template as EventType : "wedding";
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [eventType, setEventType] = useState<EventType>(() => initialEventType(initialTemplate));
  const [brief, setBrief] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayPrompt, setDisplayPrompt] = useState<string>(rotatingPrompts[0]);
  const [deletingPrompt, setDeletingPrompt] = useState(false);
  const selectedEventType = eventTypes.find((type) => type.value === eventType) ?? eventTypes[0];
  const targetPrompt = rotatingPrompts[promptIndex];

  useEffect(() => {
    if (brief.trim()) return;

    let timeout: number;
    if (!deletingPrompt && displayPrompt === targetPrompt) {
      timeout = window.setTimeout(() => setDeletingPrompt(true), 1800);
    } else if (deletingPrompt && displayPrompt.length === 0) {
      timeout = window.setTimeout(() => {
        setDeletingPrompt(false);
        setPromptIndex((current) => (current + 1) % rotatingPrompts.length);
      }, 0);
    } else if (deletingPrompt) {
      timeout = window.setTimeout(() => setDisplayPrompt((current) => current.slice(0, -1)), 24);
    } else {
      timeout = window.setTimeout(() => setDisplayPrompt(targetPrompt.slice(0, displayPrompt.length + 1)), 38);
    }

    return () => window.clearTimeout(timeout);
  }, [brief, deletingPrompt, displayPrompt, targetPrompt]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = brief.trim();
    if (!description) {
      inputRef.current?.focus();
      return;
    }
    const typedBrief = eventType === "other" ? description : `${selectedEventType.label} event. ${description}`;
    router.push(eventDraftEntryPath({
      brief: typedBrief,
      authenticated,
      authConfigured,
      signupEnabled,
    }));
  }

  function insertStarter() {
    if (!brief.trim() && selectedEventType.starter) {
      setBrief(selectedEventType.starter);
    }
    inputRef.current?.focus();
  }

  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in" : "Start building";

  return (
    <form onSubmit={submit} className="flex h-[6.125rem] flex-col justify-between rounded-[1.75rem] bg-white px-3 py-3 text-left shadow-[0_10px_40px_rgba(12,45,58,0.14),0_1px_2px_rgba(12,45,58,0.05)] ring-1 ring-black/[0.04]">
      <span className="sr-only">{ctaLabel}</span>
      <label htmlFor="event-brief" className="sr-only">Describe your event</label>
      <div className="relative min-h-0 flex-1">
        <input
          ref={inputRef}
          id="event-brief"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          maxLength={2000}
          aria-label="Describe your event"
          placeholder={selectedEventType.placeholder}
          className="size-full bg-transparent px-2 text-[16px] leading-6 text-neutral-800 outline-none placeholder:text-transparent"
        />
        {!brief && <span aria-hidden="true" className="eventloom-prompt-placeholder pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 text-[16px] leading-6 text-neutral-400"><span>{promptPrefix} </span><span>{displayPrompt}</span></span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={insertStarter} aria-label="Use a starting idea" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600">
          <Plus className="size-4" strokeWidth={1.6} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          <div className="relative inline-flex items-center">
            <span className="pointer-events-none inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-neutral-400">
              {selectedEventType.label}
              <ChevronDown className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <select value={eventType} onChange={(event) => { const nextEventType = event.target.value as EventType; setEventType(nextEventType); if (!brief.trim()) setBrief(eventTypes.find((type) => type.value === nextEventType)?.starter ?? ""); }} aria-label="Event type" className="absolute inset-0 cursor-pointer opacity-0">
              {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <button type="button" aria-label="Start voice recording" className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600">
            <Mic className="size-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
