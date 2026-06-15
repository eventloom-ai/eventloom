"use client";

import { Check, ChevronDown, Clock, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import type { EventRecord } from "@/lib/types";

type Attendance = "yes" | "no" | "";
type Gender = "male" | "female" | "";
type Lang = "en" | "ar";

type GuestName = {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
};

const MAX_NAME_LENGTH = 80;
const MAX_GUESTS = 20;

const text = {
  en: {
    language: "العربية",
    scroll: "Scroll to reply",
    inviteLabel: "Together with their families",
    inviteNames: "A & N",
    inviteCopy: "Request the honor of your presence at their wedding celebration.",
    replyBy: "Please reply two weeks before the event",
    scheduleTitle: "Schedule of Events",
    scheduleDate: "Summer 2026",
    venueLabel: "Venue",
    venueTitle: "Getting There",
    venueName: "Private Event Hall",
    hallInfo: "Men's Hall: A · Women's Hall: F",
    directions: "Location shared with invited guests",
    replyLabel: "Kindly Reply",
    replyTitle: "Guest Reply",
    replySubtitle: "Please share your attendance details so the family can prepare your place with care.",
    deadline: "Reply requested two weeks before the event",
    firstName: "First Name",
    lastName: "Last Name",
    attending: "Will you be attending?",
    yes: "Yes",
    no: "No",
    guestsTitle: "Guests",
    guestsSubtitle: "Add each person attending, including you.",
    add: "Add",
    party: "Party",
    male: "Male",
    female: "Female",
    gender: "Gender",
    remove: "Remove",
    send: "Send Reply",
    sending: "Sending",
    receivedLabel: "Reply Received",
    thanksTitle: "Thank you",
    thanksMessage: "Your response has been recorded. We are grateful to celebrate this day with the people closest to us.",
    duplicateGuest: "Each guest should only be listed once.",
    errorGeneral: "We could not save your reply. Please try again.",
    events: [
      { title: "Reception", time: "6:00 PM", location: "", description: "Guest welcome, soft drinks, and family greetings." },
      { title: "Zaffa & Dabka", time: "6:45 PM", location: "Hall A — Men", description: "Traditional entrance celebration and dabka." },
      { title: "Couple Entrance", time: "7:15 PM", location: "Hall F — Women", description: "The couple makes their entrance with family." },
      { title: "Dinner", time: "8:00 PM", location: "Hall A · Hall F", description: "Dinner served in the assigned halls." },
    ],
  },
  ar: {
    language: "English",
    scroll: "مرر لتأكيد الحضور",
    inviteLabel: "مع عائلتيهما",
    inviteNames: "A & N",
    inviteCopy: "يتشرفان بدعوتكم لحضور حفل زفافهما.",
    replyBy: "يرجى الرد قبل المناسبة بأسبوعين",
    scheduleTitle: "جدول الفعاليات",
    scheduleDate: "صيف ٢٠٢٦",
    venueLabel: "المكان",
    venueTitle: "كيف تصل",
    venueName: "قاعة خاصة للمناسبة",
    hallInfo: "قاعة الرجال: A · قاعة النساء: F",
    directions: "تتم مشاركة الموقع مع المدعوين",
    replyLabel: "الرجاء الرد",
    replyTitle: "تأكيد الحضور",
    replySubtitle: "يرجى مشاركة تفاصيل حضورك حتى تتمكن العائلة من تجهيز مكانك باهتمام.",
    deadline: "يرجى الرد قبل المناسبة بأسبوعين",
    firstName: "الاسم الأول",
    lastName: "اسم العائلة",
    attending: "هل ستحضر؟",
    yes: "نعم",
    no: "لا",
    guestsTitle: "الضيوف",
    guestsSubtitle: "أضف كل شخص سيحضر، بما فيك أنت.",
    add: "إضافة",
    party: "المجموعة",
    male: "ذكر",
    female: "أنثى",
    gender: "الجنس",
    remove: "إزالة",
    send: "إرسال الرد",
    sending: "جارٍ الإرسال",
    receivedLabel: "تم استلام الرد",
    thanksTitle: "شكراً لك",
    thanksMessage: "تم تسجيل ردك. يسعدنا الاحتفال بهذا اليوم مع أعز الناس إلينا.",
    duplicateGuest: "لا يجب إدراج كل ضيف إلا مرة واحدة.",
    errorGeneral: "لم نتمكن من حفظ ردك. يرجى المحاولة مرة أخرى.",
    events: [
      { title: "الاستقبال", time: "٦:٠٠ مساءً", location: "", description: "استقبال الضيوف والمشروبات والتحية العائلية." },
      { title: "الزفة والدبكة", time: "٦:٤٥ مساءً", location: "قاعة A — الرجال", description: "زفة تقليدية ودبكة." },
      { title: "دخول العروسين", time: "٧:١٥ مساءً", location: "قاعة F — النساء", description: "دخول العروسين مع العائلة." },
      { title: "العشاء", time: "٨:٠٠ مساءً", location: "قاعة A · قاعة F", description: "يقدم العشاء في القاعات المخصصة." },
    ],
  },
};

export function WeddingDemoPage({ event }: { event: EventRecord }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = text[lang];
  const isAr = lang === "ar";

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="relative isolate min-h-screen overflow-hidden text-[#1f1a17]">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#ead9bd]/40 blur-3xl" />
        <div className="absolute bottom-36 left-0 h-[28rem] w-[28rem] rounded-full bg-[#d9a3a0]/20 blur-3xl" />
      </div>

      <div className="flex justify-end px-5 pt-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => setLang(isAr ? "en" : "ar")}
          className="rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f3032] shadow-sm backdrop-blur-xl transition hover:bg-white/65"
        >
          {t.language}
        </button>
      </div>

      <section className="px-5 pb-20 pt-6 sm:px-8 lg:px-12 lg:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
          <div className="relative w-full max-w-[760px]">
            <div className="absolute -inset-5 rounded-[2.2rem] bg-white/40 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 p-3 shadow-[0_30px_90px_rgba(65,42,36,0.18)] backdrop-blur-xl sm:p-4">
              <InvitationCard t={t} />
            </div>
          </div>

          <a href="#reply" className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6f3032]/70">{t.scroll}</p>
            <ChevronDown className="h-5 w-5 animate-bounce text-[#6f3032]/60" />
          </a>
        </div>
      </section>

      <ScheduleSection t={t} />
      <VenueSection t={t} />
      <section id="reply" className="px-5 pb-28 pt-14 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <WeddingReplyForm event={event} t={t} />
        </div>
      </section>
    </main>
  );
}

function InvitationCard({ t }: { t: typeof text.en }) {
  return (
    <div className="relative aspect-[5/7] overflow-hidden rounded-[1.45rem] bg-[#f7f2ed]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(217,163,160,0.26),transparent_18rem),linear-gradient(160deg,#fffaf5,#f0dfd5_52%,#fbf7f1)]" />
      <div className="absolute inset-8 rounded-[1.2rem] border border-[#6f3032]/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#747d5c]">{t.inviteLabel}</p>
        <h1 className="mt-7 font-serif text-7xl font-medium leading-none text-[#6f3032] sm:text-8xl">{t.inviteNames}</h1>
        <div className="my-8 h-px w-28 bg-[#6f3032]/25" />
        <p className="max-w-md font-serif text-2xl leading-10 text-[#1f1a17]">{t.inviteCopy}</p>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f3032]/70">{t.replyBy}</p>
      </div>
    </div>
  );
}

function ScheduleSection({ t }: { t: typeof text.en }) {
  return (
    <section className="px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center sm:mb-14">
          <h2 className="font-serif text-4xl text-[#1f1a17] sm:text-5xl">{t.scheduleTitle}</h2>
          <p className="mt-3 text-sm text-[#1f1a17]/55">{t.scheduleDate}</p>
        </div>

        <div className="relative">
          <div className="absolute start-[9px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[#6f3032]/25 via-[#6f3032]/50 to-transparent" />
          <div className="space-y-4 sm:space-y-6">
            {t.events.map((item) => (
              <div key={item.title} className="flex gap-4 sm:gap-7">
                <div className="relative mt-[1.25rem] shrink-0 sm:mt-[1.55rem]">
                  <div className="h-[19px] w-[19px] rounded-full border-2 border-[#6f3032] bg-white shadow-[0_0_0_3px_rgba(111,48,50,0.1)]" />
                </div>
                <article className="flex-1 rounded-[1.2rem] border border-white/70 bg-white/50 p-4 shadow-[0_20px_60px_rgba(65,42,36,0.11)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/65 sm:rounded-[1.35rem] sm:p-6">
                  <h3 className="font-serif text-2xl text-[#6f3032] sm:text-3xl">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#1f1a17]/55">{item.description}</p>
                  <div className="mt-4 grid gap-2 text-sm text-[#1f1a17]/70 sm:mt-5 sm:gap-3">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 shrink-0 text-[#6f3032]" />
                      <span>{item.time}</span>
                    </div>
                    {item.location ? (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 shrink-0 text-[#6f3032]" />
                        <span>{item.location}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VenueSection({ t }: { t: typeof text.en }) {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[#747d5c]">{t.venueLabel}</p>
        <h2 className="font-serif text-4xl text-[#1f1a17] sm:text-5xl">{t.venueTitle}</h2>
        <p className="mt-5 font-serif text-2xl text-[#1f1a17]">{t.venueName}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#1f1a17]/60">{t.hallInfo}</p>
        <div className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#6f3032] px-6 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(111,48,50,0.22)]">
          <MapPin className="h-4 w-4" />
          {t.directions}
        </div>
      </div>
    </section>
  );
}

function WeddingReplyForm({ event, t }: { event: EventRecord; t: typeof text.en }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("");
  const [guestNames, setGuestNames] = useState<GuestName[]>([{ id: "guest-1", firstName: "", lastName: "", gender: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const nextGuestId = useRef(2);

  const attending = attendance === "yes";
  const partySize = guestNames.length;
  const maleGuests = guestNames.filter((guest) => guest.gender === "male").length;
  const femaleGuests = guestNames.filter((guest) => guest.gender === "female").length;
  const normalizedGuestNames = guestNames.map((guest) => `${guest.firstName.trim()} ${guest.lastName.trim()}`.replace(/\s+/g, " ").toLowerCase());
  const hasDuplicateGuests = attending && new Set(normalizedGuestNames.filter(Boolean)).size !== normalizedGuestNames.length;
  const hasGuestNames = !attending
    ? true
    : guestNames.every((guest) => guest.firstName.trim() && guest.lastName.trim() && guest.gender) && !hasDuplicateGuests;

  const canSubmit = useMemo(() => {
    if (!firstName.trim() || !lastName.trim() || !attendance) return false;
    if (attending) return partySize >= 1 && hasGuestNames;
    return true;
  }, [attendance, attending, firstName, hasGuestNames, lastName, partySize]);

  function selectAttendance(next: Attendance) {
    setAttendance(next);
    if (next === "yes") {
      setGuestNames((current) => {
        if (current.some((guest) => guest.firstName || guest.lastName || guest.gender)) return current;
        return [{ ...current[0], firstName: firstName.trim(), lastName: lastName.trim() }];
      });
    }
  }

  function addGuest() {
    if (guestNames.length >= MAX_GUESTS) return;
    setGuestNames((current) => [...current, { id: `guest-${nextGuestId.current++}`, firstName: "", lastName: "", gender: "" }]);
  }

  function removeGuest(id: string) {
    setGuestNames((current) => (current.length === 1 ? current : current.filter((guest) => guest.id !== id)));
  }

  function updateGuest(id: string, field: keyof Omit<GuestName, "id">, value: string) {
    setGuestNames((current) => current.map((guest) => (guest.id === id ? { ...guest, [field]: value as GuestName[typeof field] } : guest)));
  }

  async function submitReply(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setSubmitError("");
    setIsSubmitting(true);

    const payload = {
      event_id: event.id,
      slug: event.slug,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      is_attending: attending,
      party_size: attending ? partySize : 0,
      guest_names: attending ? guestNames.map((guest) => `${guest.firstName.trim()} ${guest.lastName.trim()} (${guest.gender === "male" ? "Male" : "Female"})`) : [],
      answers: {
        male_guests: String(attending ? maleGuests : 0),
        female_guests: String(attending ? femaleGuests : 0),
      },
    };

    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setIsSubmitting(false);
    if (!response?.ok) {
      setSubmitError(t.errorGeneral);
      return;
    }

    setIsComplete(true);
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/65 bg-white/35 shadow-[0_30px_90px_rgba(65,42,36,0.18)] backdrop-blur-2xl">
      {isComplete ? (
        <div className="px-6 py-16 text-center sm:px-12">
          <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-full bg-[#6f3032] text-white shadow-xl">
            <Check className="h-8 w-8" />
          </div>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[#747d5c]">{t.receivedLabel}</p>
          <h2 className="font-serif text-4xl text-[#1f1a17] sm:text-5xl">{t.thanksTitle}</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#1f1a17]/65">{t.thanksMessage}</p>
        </div>
      ) : (
        <form onSubmit={submitReply} className="px-5 py-8 sm:px-10 sm:py-10">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[#747d5c]">{t.replyLabel}</p>
            <h2 className="font-serif text-4xl text-[#1f1a17] sm:text-5xl">{t.replyTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#1f1a17]/60">{t.replySubtitle}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6f3032]/70">{t.deadline}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label={t.firstName} value={firstName} onChange={setFirstName} />
            <TextField label={t.lastName} value={lastName} onChange={setLastName} />
          </div>

          <fieldset className="mt-7">
            <legend className="mb-3 text-sm font-medium text-[#1f1a17]/75">{t.attending}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <RadioCard label={t.yes} selected={attendance === "yes"} onClick={() => selectAttendance("yes")} />
              <RadioCard label={t.no} selected={attendance === "no"} onClick={() => selectAttendance("no")} />
            </div>
          </fieldset>

          {attending ? (
            <div className="mt-7 space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <SummaryPill label={t.party} value={partySize} />
                <SummaryPill label={t.male} value={maleGuests} />
                <SummaryPill label={t.female} value={femaleGuests} />
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl text-[#1f1a17]">{t.guestsTitle}</h3>
                    <p className="mt-1 text-sm text-[#1f1a17]/55">{t.guestsSubtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addGuest}
                    disabled={guestNames.length >= MAX_GUESTS}
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#6f3032]/20 bg-white/55 px-4 text-sm font-semibold text-[#6f3032] shadow-sm transition hover:-translate-y-0.5 hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Plus className="h-4 w-4" />
                    {t.add}
                  </button>
                </div>

                <div className="space-y-4">
                  {guestNames.map((guest, index) => (
                    <div key={guest.id} className="grid gap-4 rounded-[1.25rem] border border-white/60 bg-white/35 p-4 sm:grid-cols-[auto_1fr_1fr_auto]">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#6f3032]/10 text-sm font-semibold text-[#6f3032]">
                        {index + 1}
                      </div>
                      <TextField label={t.firstName} value={guest.firstName} onChange={(value) => updateGuest(guest.id, "firstName", value)} />
                      <TextField label={t.lastName} value={guest.lastName} onChange={(value) => updateGuest(guest.id, "lastName", value)} />
                      <div className="grid gap-3 sm:col-span-4 sm:grid-cols-[1fr_auto] lg:col-span-1 lg:block">
                        <GenderField value={guest.gender} onChange={(value) => updateGuest(guest.id, "gender", value)} labels={t} />
                        <button
                          type="button"
                          onClick={() => removeGuest(guest.id)}
                          disabled={guestNames.length === 1}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#6f3032]/15 bg-white/45 px-4 text-sm font-medium text-[#6f3032] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-35 sm:self-end lg:mt-7 lg:w-11 lg:px-0"
                          aria-label={`${t.remove} ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="lg:hidden">{t.remove}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {hasDuplicateGuests ? (
                  <p className="mt-4 rounded-2xl border border-[#6f3032]/15 bg-white/55 px-4 py-3 text-sm text-[#6f3032]">{t.duplicateGuest}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {submitError ? <p className="mt-6 rounded-2xl border border-[#6f3032]/15 bg-white/55 px-4 py-3 text-sm text-[#6f3032]">{submitError}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#6f3032] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_50px_rgba(111,48,50,0.28)] transition hover:-translate-y-0.5 hover:bg-[#5f292b] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.sending}
              </>
            ) : (
              t.send
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#1f1a17]/75">{label}</span>
      <input className="premium-field" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} maxLength={MAX_NAME_LENGTH} />
    </label>
  );
}

function RadioCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.2rem] border px-5 py-4 text-start text-sm font-semibold transition ${
        selected ? "border-[#6f3032]/40 bg-[#6f3032] text-white shadow-[0_14px_35px_rgba(111,48,50,0.22)]" : "border-white/60 bg-white/42 text-[#1f1a17]/75 hover:bg-white/65"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.15rem] border border-white/60 bg-white/42 px-5 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[#1f1a17]/45">{label}</p>
      <p className="mt-1 font-serif text-3xl text-[#6f3032]">{value}</p>
    </div>
  );
}

function GenderField({ value, onChange, labels }: { value: Gender; onChange: (value: Gender) => void; labels: typeof text.en }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#1f1a17]/75">{labels.gender}</span>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "male" as const, label: labels.male },
          { value: "female" as const, label: labels.female },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-[3.35rem] rounded-full border text-sm font-semibold transition ${
              value === option.value ? "border-[#6f3032]/40 bg-[#6f3032] text-white" : "border-[#6f3032]/15 bg-white/45 text-[#6f3032]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </label>
  );
}
