"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Loader2, Mail, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { searchableRsvpText, summarizeRsvps, type CreatorRsvpSubmission } from "@/lib/rsvp-dashboard";

type AttendanceFilter = "all" | "attending" | "declined";

function fullName(submission: CreatorRsvpSubmission) {
  return `${submission.first_name} ${submission.last_name}`.trim();
}

function answerLabel(key: string) {
  if (key === "note") return "Note";
  if (key === "meal_preference") return "Meal preference";
  return key.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function submittedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RsvpManager({ eventId, initialSubmissions }: { eventId: string; initialSubmissions: CreatorRsvpSubmission[] }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [selected, setSelected] = useState<CreatorRsvpSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CreatorRsvpSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const summary = useMemo(() => summarizeRsvps(submissions), [submissions]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return submissions.filter((submission) => {
      const matchesAttendance =
        filter === "all" ||
        (filter === "attending" && submission.is_attending) ||
        (filter === "declined" && !submission.is_attending);
      return matchesAttendance && (!normalizedQuery || searchableRsvpText(submission).includes(normalizedQuery));
    });
  }, [filter, query, submissions]);

  async function deleteSubmission() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    const response = await fetch(`/api/events/${eventId}/rsvps/${deleteTarget.id}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      setDeleteError(response?.status === 403
        ? "Your secure session expired. Verify your account again and retry."
        : "This response could not be deleted. Please try again.");
      setDeleting(false);
      return;
    }

    setSubmissions((current) => current.filter((submission) => submission.id !== deleteTarget.id));
    setSelected((current) => current?.id === deleteTarget.id ? null : current);
    setDeleteTarget(null);
    setDeleting(false);
  }

  const cards = [
    { label: "Responses", value: summary.responses, icon: Mail, tone: "bg-[#e4eeeb] text-[#315c5d]" },
    { label: "Attending", value: summary.attending, icon: Check, tone: "bg-[#dcebd8] text-[#285b47]" },
    { label: "Not attending", value: summary.declined, icon: X, tone: "bg-rose-50 text-rose-700" },
    { label: "Expected guests", value: summary.expectedGuests, icon: Users, tone: "bg-[#f3e7d9] text-[#8a6153]" },
  ] as const;

  return (
    <>
      <section aria-label="RSVP summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="eventloom-app-card rounded-[1.5rem] p-5">
            <div className={`grid size-9 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></div>
            <p className="mt-5 font-[family-name:var(--font-playfair)] text-4xl font-medium leading-none tracking-[-0.045em] tabular-nums">{value}</p>
            <p className="mt-2 text-sm text-[#6d6055]">{label}</p>
          </div>
        ))}
      </section>

      <section className="eventloom-app-card mt-6 overflow-hidden rounded-[1.5rem]">
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative block min-w-0 flex-1 md:max-w-sm">
            <span className="sr-only">Search guest replies</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868b]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search names, email, phone, or notes"
              className="eventloom-app-field w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none"
            />
          </label>
          <div className="flex rounded-xl bg-[#e7ecdf] p-1" aria-label="Filter guest replies">
            {([
              ["all", "All"],
              ["attending", "Attending"],
              ["declined", "Not attending"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filter === value ? "bg-[#fffaf3] text-[#604139] shadow-sm" : "text-[#6d6055]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="border-b border-black/[0.06] bg-[#fbfbfd] text-xs font-medium uppercase tracking-wide text-[#86868b]">
                  <tr>
                    <th className="px-5 py-3">Guest</th>
                    <th className="px-5 py-3">Reply</th>
                    <th className="px-5 py-3">Party</th>
                    <th className="px-5 py-3">Submitted</th>
                    <th className="w-12 px-3 py-3"><span className="sr-only">View details</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filtered.map((submission) => (
                    <tr key={submission.id} className="transition hover:bg-[#fbfbfd]">
                      <td className="px-5 py-4">
                        <button type="button" onClick={() => setSelected(submission)} className="text-left">
                          <span className="block text-sm font-semibold">{fullName(submission)}</span>
                          <span className="mt-1 block text-xs text-[#86868b]">{submission.email || submission.phone || "No contact details"}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${submission.is_attending ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {submission.is_attending ? "Attending" : "Not attending"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums">{submission.is_attending ? submission.party_size : "—"}</td>
                      <td className="px-5 py-4 text-sm text-[#6e6e73]">{submittedAt(submission.created_at)}</td>
                      <td className="px-3 py-4">
                        <button type="button" onClick={() => setSelected(submission)} aria-label={`View response from ${fullName(submission)}`} className="grid size-8 place-items-center rounded-full hover:bg-black/5">
                          <ChevronRight className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-black/[0.05] md:hidden">
              {filtered.map((submission) => (
                <button key={submission.id} type="button" onClick={() => setSelected(submission)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{fullName(submission)}</span>
                    <span className={`mt-1 block text-xs ${submission.is_attending ? "text-emerald-700" : "text-rose-700"}`}>
                      {submission.is_attending ? `Attending · party of ${submission.party_size}` : "Not attending"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#86868b]" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <UserRound className="mx-auto size-8 text-[#aeaeb2]" />
            <p className="mt-4 font-semibold">{submissions.length ? "No replies match your search" : "No guest replies yet"}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#6e6e73]">
              {submissions.length ? "Try another name, contact detail, or attendance filter." : "New responses will appear here as soon as guests submit the RSVP form."}
            </p>
          </div>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="response-title" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelected(null); }}>
          <section className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${selected.is_attending ? "text-emerald-700" : "text-rose-700"}`}>
                  {selected.is_attending ? "Attending" : "Not attending"}
                </p>
                <h2 id="response-title" className="mt-2 text-2xl font-semibold">{fullName(selected)}</h2>
                <p className="mt-2 text-sm text-[#6e6e73]">Submitted {submittedAt(selected.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close response details" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f5f5f7]"><X className="size-4" /></button>
            </div>

            <dl className="mt-8 grid gap-5 rounded-2xl bg-[#f5f5f7] p-5 sm:grid-cols-2">
              <div><dt className="text-xs text-[#86868b]">Email</dt><dd className="mt-1 break-words text-sm font-medium">{selected.email || "Not provided"}</dd></div>
              <div><dt className="text-xs text-[#86868b]">Phone</dt><dd className="mt-1 break-words text-sm font-medium">{selected.phone || "Not provided"}</dd></div>
              <div><dt className="text-xs text-[#86868b]">Party size</dt><dd className="mt-1 text-sm font-medium">{selected.is_attending ? selected.party_size : "Not attending"}</dd></div>
              <div><dt className="text-xs text-[#86868b]">Response status</dt><dd className="mt-1 text-sm font-medium capitalize">{selected.status}</dd></div>
            </dl>

            {selected.rsvp_guests.length ? (
              <section className="mt-8">
                <h3 className="text-sm font-semibold">Guest names</h3>
                <ul className="mt-3 divide-y divide-black/[0.06] rounded-2xl border border-black/[0.07]">
                  {selected.rsvp_guests.map((guest) => <li key={guest.name} className="px-4 py-3 text-sm">{guest.name}</li>)}
                </ul>
              </section>
            ) : null}

            {selected.rsvp_answers.some((answer) => answer.value.trim()) ? (
              <section className="mt-8">
                <h3 className="text-sm font-semibold">Answers and comments</h3>
                <dl className="mt-3 grid gap-3">
                  {selected.rsvp_answers.filter((answer) => answer.value.trim()).map((answer) => (
                    <div key={answer.field_key} className="rounded-2xl border border-black/[0.07] p-4">
                      <dt className="text-xs font-medium text-[#86868b]">{answerLabel(answer.field_key)}</dt>
                      <dd className="mt-2 whitespace-pre-wrap text-sm leading-6">{answer.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <p className="mt-8 rounded-2xl border border-dashed border-black/10 p-5 text-sm text-[#6e6e73]">No additional comments or answers were provided.</p>
            )}

            <button type="button" onClick={() => { setDeleteError(""); setDeleteTarget(selected); }} className="mt-10 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
              <Trash2 className="size-4" /> Delete response
            </button>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-response-title">
          <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-response-title" className="text-xl font-semibold">Delete this response?</h2>
            <p className="mt-3 text-sm leading-6 text-[#6e6e73]">
              The RSVP from {fullName(deleteTarget)}, including guests and comments, will be permanently deleted.
            </p>
            {deleteError ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{deleteError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium">Cancel</button>
              <button type="button" disabled={deleting} onClick={() => void deleteSubmission()} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
