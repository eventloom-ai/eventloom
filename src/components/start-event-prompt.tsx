"use client";

import { ChevronDown, Mic, Plus } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { eventDraftEntryPath } from "@/lib/event-entry";

const eventTypes = [
  { value: "other", label: "Event", placeholder: "Ask Eventloom to create an event site…" },
  { value: "wedding", label: "Wedding", placeholder: "Ask Eventloom to create a wedding site…" },
  { value: "engagement", label: "Engagement", placeholder: "Ask Eventloom to create an engagement party site…" },
  { value: "birthday", label: "Birthday", placeholder: "Ask Eventloom to create a birthday invitation…" },
  { value: "celebration", label: "Celebration", placeholder: "Ask Eventloom to create a celebration site…" },
  { value: "corporate", label: "Corporate event", placeholder: "Ask Eventloom to create a corporate event page…" },
] as const;

const rotatingPrompts = [
  "a wedding site…",
  "a birthday invitation…",
  "a garden party site…",
  "a corporate event page…",
  "a baby shower site…",
] as const;

const promptPrefix = "Ask Eventloom to create";

interface SpeechRecognitionResultLike {
  [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type EventType = (typeof eventTypes)[number]["value"];

function initialEventType(value?: string): EventType {
  return eventTypes.some((type) => type.value === value) ? value as EventType : "other";
}

export function StartEventPrompt({
  initialEventType: eventTypeHint,
  authenticated = false,
  authConfigured = true,
  signupEnabled = false,
}: {
  initialEventType?: string;
  authenticated?: boolean;
  authConfigured?: boolean;
  signupEnabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [eventType, setEventType] = useState<EventType>(() => initialEventType(eventTypeHint));
  const [brief, setBrief] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayPrompt, setDisplayPrompt] = useState<string>(rotatingPrompts[0]);
  const [deletingPrompt, setDeletingPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const selectedEventType = eventTypes.find((type) => type.value === eventType) ?? eventTypes[0];
  const targetPrompt = rotatingPrompts[promptIndex];
  const ctaLabel = authConfigured && !authenticated && !signupEnabled ? "Sign in" : "Start building";

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setBrief((current) => (current ? `${current} ${transcript}` : transcript));
      }
      inputRef.current?.focus();
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

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
          className="flex size-full items-center bg-transparent px-2 text-[16px] leading-6 text-neutral-800 outline-none placeholder:text-transparent"
        />
        {!brief && (
          <span aria-hidden="true" className="eventloom-prompt-placeholder pointer-events-none absolute inset-0 flex items-center px-2 text-[16px] leading-6 text-neutral-400">
            <span>{promptPrefix} </span><span>{displayPrompt}</span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => inputRef.current?.focus()} aria-label="Describe your event" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600">
          <Plus className="size-4" strokeWidth={1.6} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          <div className="relative inline-flex items-center">
            <span className="pointer-events-none inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-medium text-neutral-400">
              {selectedEventType.label}
              <ChevronDown className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)} aria-label="Event type" className="absolute inset-0 cursor-pointer opacity-0">
              {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={toggleDictation}
            aria-label={listening ? "Stop voice recording" : "Start voice recording"}
            aria-pressed={listening}
            className={`flex size-8 items-center justify-center rounded-full transition hover:bg-neutral-50 ${listening ? "animate-pulse text-rose-500" : "text-neutral-400 hover:text-neutral-600"}`}
          >
            <Mic className="size-4" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
