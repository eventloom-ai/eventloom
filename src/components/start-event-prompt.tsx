"use client";

import { ArrowUp, ChevronDown } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { eventDraftEntryPath } from "@/lib/event-entry";

const eventTypes = [
  { value: "wedding", label: "Wedding", starter: "An elegant wedding celebration with a thoughtful RSVP for our guests." },
  { value: "engagement", label: "Engagement", starter: "A beautiful engagement celebration with event details and guest replies." },
  { value: "birthday", label: "Birthday", starter: "A memorable birthday celebration with a personal event site and RSVP." },
  { value: "celebration", label: "Celebration", starter: "A special celebration with a custom website and simple guest RSVP." },
  { value: "corporate", label: "Corporate event", starter: "A polished corporate event page with the schedule, venue details, and attendee replies." },
  { value: "other", label: "Something else", starter: "" },
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

  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in" : "Start building";

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#1d1a21]/85 text-left shadow-[0_24px_70px_rgba(5,2,11,0.35)] backdrop-blur-xl">
      <label htmlFor="event-brief" className="sr-only">Describe your event</label>
      <textarea
        ref={textareaRef}
        id="event-brief"
        value={brief}
        onChange={(event) => setBrief(event.target.value)}
        maxLength={2000}
        rows={2}
        aria-label="Describe your event"
        placeholder="Describe the event you want to bring to life…"
        className="block w-full resize-none bg-transparent px-5 py-4 text-[15px] leading-6 text-white outline-none placeholder:text-white/40"
      />
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3">
        <div className="relative min-w-0">
          <select
            value={eventType}
            onChange={(event) => {
              const nextEventType = event.target.value as EventType;
              setEventType(nextEventType);
              if (!brief.trim()) setBrief(eventTypes.find((type) => type.value === nextEventType)?.starter ?? "");
            }}
            aria-label="Event type"
            className="min-w-0 appearance-none bg-transparent py-2 pl-2 pr-7 text-sm font-medium text-white/70 outline-none transition hover:text-white focus:text-white"
          >
            {eventTypes.map((type) => <option key={type.value} value={type.value} className="bg-[#1d1a21] text-white">{type.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 size-3.5 -translate-y-1/2 text-white/45" />
        </div>
        <button type="submit" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#221b29] transition hover:bg-[#f9e7df] active:scale-[0.98]">
          {ctaLabel}
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
