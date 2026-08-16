"use client";

import { ArrowUp, ChevronDown, Plus } from "lucide-react";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [eventType, setEventType] = useState<EventType>(() => initialEventType(initialTemplate));
  const [brief, setBrief] = useState("");
  const selectedEventType = eventTypes.find((type) => type.value === eventType) ?? eventTypes[0];
  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in" : "Start building";
  const canSubmit = Boolean(brief.trim());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const description = brief.trim();
    if (!description) {
      textareaRef.current?.focus();
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

  function onBriefKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function insertStarter() {
    if (!brief.trim() && selectedEventType.starter) {
      setBrief(selectedEventType.starter);
    }
    textareaRef.current?.focus();
  }

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-[1.5rem] bg-white text-left shadow-[0_8px_28px_rgba(12,45,58,0.12),0_1px_2px_rgba(12,45,58,0.06)] ring-1 ring-black/[0.04]"
    >
      <label htmlFor="event-brief" className="sr-only">Describe your event</label>
      <textarea
        ref={textareaRef}
        id="event-brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        onKeyDown={onBriefKeyDown}
        maxLength={2000}
        rows={2}
        aria-label="Describe your event"
        placeholder={selectedEventType.placeholder}
        className="block w-full resize-none bg-transparent px-4 pb-1.5 pt-4 text-[14px] leading-6 text-[#302821] outline-none placeholder:text-neutral-400"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <button
          type="button"
          onClick={insertStarter}
          aria-label="Use a starting idea"
          className="flex size-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-600"
        >
          <Plus className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center">
            <span className="pointer-events-none inline-flex items-center gap-0.5 py-1 text-[13px] font-medium text-neutral-400">
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
            className={`flex size-7 items-center justify-center rounded-full transition active:scale-[0.98] ${
              canSubmit
                ? "bg-[#302821] text-white hover:bg-[#4a2d2a]"
                : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
            }`}
          >
            <ArrowUp className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{ctaLabel}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
