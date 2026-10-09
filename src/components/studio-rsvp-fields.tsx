"use client";

import { useId } from "react";
import { createUsePuck, type CustomField } from "@puckeditor/core";
import { normalizeRsvpFields } from "@/lib/puck-document";
import { formatRsvpDeadlineDay, parseRsvpDeadline } from "@/lib/rsvp-deadline";
import type { RsvpField } from "@/lib/types";

const usePuck = createUsePuck();

const QUESTIONS: { field: RsvpField; label: string; required?: boolean }[] = [
  { field: "name", label: "Name", required: true },
  { field: "attendance", label: "Attending or not", required: true },
  { field: "party_size", label: "Party size" },
  { field: "guest_names", label: "Guest names" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "meal_preference", label: "Meal preference" },
  { field: "note", label: "Note to the host" },
];

const labelClass = "mb-1.5 block text-[13px] font-semibold text-[#1c1917]";

/** Which questions the RSVP form asks; name and attendance are always asked. */
export function rsvpQuestionsPuckField(): CustomField<RsvpField[]> {
  return {
    type: "custom",
    label: "Questions for guests",
    render: function RsvpQuestions({ value, onChange, readOnly }) {
      const selected = normalizeRsvpFields(value);
      return (
        <fieldset data-rsvp-questions="">
          <legend className={labelClass}>Questions for guests</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {QUESTIONS.map(({ field, label, required }) => (
              <label key={field} className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12px] text-[#1c1917]">
                <input
                  type="checkbox"
                  checked={selected.includes(field)}
                  disabled={readOnly || required}
                  onChange={(event) => onChange(normalizeRsvpFields(event.target.checked ? [...selected, field] : selected.filter((item) => item !== field)))}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      );
    },
  };
}

/** The RSVP deadline as free text, with a line saying when replies will actually close. */
export function rsvpDeadlinePuckField(): CustomField<string> {
  return {
    type: "custom",
    label: "RSVP deadline",
    render: function RsvpDeadline({ value, onChange, readOnly }) {
      const id = useId();
      const eventDate = usePuck((state) => (state.appState.data.root.props as { eventDate?: unknown } | undefined)?.eventDate);
      const text = typeof value === "string" ? value : "";
      const day = parseRsvpDeadline(text, typeof eventDate === "string" ? eventDate : undefined);
      const note = !text.trim()
        ? "Leave empty to take replies until you close them."
        : day
          ? `Replies close at the end of ${formatRsvpDeadlineDay(day)}, event time.`
          : "Not a date we can read, so replies stay open. Try “June 1, 2027”.";
      return (
        <div>
          <label htmlFor={id} className={labelClass}>RSVP deadline</label>
          <input id={id} className="w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-[13px] text-[#1c1917] outline-none focus:border-[#155166] disabled:opacity-60" value={text} disabled={readOnly} maxLength={180} placeholder="e.g. June 1, 2027" onChange={(event) => onChange(event.target.value)} />
          <p className="mt-1.5 text-[11px] leading-4 text-[#78716c]" data-rsvp-deadline-note="">{note}</p>
        </div>
      );
    },
  };
}
