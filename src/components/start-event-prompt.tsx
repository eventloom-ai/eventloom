"use client";

import { ArrowUp, ChevronDown, Plus } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
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
  const selectedEventType = eventTypes.find((type) => type.value === eventType) ?? eventTypes[0];
  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in" : "Start building";
  const canSubmit = Boolean(brief.trim());

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

  return (
    <form
      onSubmit={submit}
      className="flex h-14 items-center gap-1 rounded-full bg-white pl-2 pr-1.5 text-left shadow-[0_10px_40px_rgba(12,45,58,0.14),0_1px_2px_rgba(12,45,58,0.05)] ring-1 ring-black/[0.04]"
    >
      <button
        type="button"
        onClick={insertStarter}
        aria-label="Use a starting idea"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600"
      >
        <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <label htmlFor="event-brief" className="sr-only">Describe your event</label>
      <input
        ref={inputRef}
        id="event-brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        maxLength={2000}
        aria-label="Describe your event"
        placeholder={selectedEventType.placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] leading-6 text-neutral-800 outline-none placeholder:text-neutral-400"
      />
      <div className="relative inline-flex shrink-0 items-center">
        <span className="pointer-events-none inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[13px] font-medium text-neutral-400">
          {selectedEventType.label}
          <ChevronDown className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <select
          value={eventType}
          onChange={(event) => {
            const nextEventType = event.target.value as EventType;
            setEventType(nextEventType);
            if (!brief.trim()) setBrief(eventTypes.find((type) => type.value === nextEventType)?.starter ?? "");
          }}
          aria-label="Event type"
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        aria-label={ctaLabel}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition ${
          canSubmit ? "text-neutral-700 hover:bg-neutral-50" : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
        }`}
      >
        <ArrowUp className="size-4" strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">{ctaLabel}</span>
      </button>
    </form>
  );
}
