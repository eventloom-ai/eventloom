"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check, ChevronDown, Clock, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useRef, useState, type ReactNode } from "react";
import { SampleInvitationTemplate } from "@/components/sample-invitation-template";
import { weddingTemplateText, type WeddingTemplateCopy, type WeddingTemplateLang } from "@/lib/wedding-template-content";
import type { EventRecord } from "@/lib/types";

type Attendance = "yes" | "no" | "";
type Gender = "male" | "female" | "";

type GuestName = {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
};

const MAX_NAME_LENGTH = 80;
const MAX_GUESTS = 20;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

type RsvpExperienceProps = {
  event: EventRecord;
  lang: WeddingTemplateLang;
  onLangChange: (lang: WeddingTemplateLang) => void;
  showNav?: boolean;
  nav?: ReactNode;
  copy?: WeddingTemplateCopy;
};

export function RsvpExperience({ event, lang, onLangChange, showNav = false, nav, copy }: RsvpExperienceProps) {
  const t = copy ?? weddingTemplateText[lang];
  const isAr = lang === "ar";

  return (
    <>
      {showNav ? nav : null}
      {!showNav ? (
        <div className="flex justify-end px-5 pt-5 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => onLangChange(isAr ? "en" : "ar")}
            className="rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--el-accent)] shadow-sm backdrop-blur-xl transition hover:bg-white/65"
          >
            {t.language}
          </button>
        </div>
      ) : null}

      <HeroSection event={event} t={t} />
      <TimelineSection t={t} />
      <LocationSection t={t} />
      <RsvpSection event={event} t={t} />
    </>
  );
}

function HeroSection({ event, t }: { event: EventRecord; t: WeddingTemplateCopy }) {
  return (
    <section className="px-5 pb-20 pt-6 sm:px-8 lg:px-12 lg:pb-28">
      <motion.div
        className="mx-auto flex max-w-6xl flex-col items-center gap-8"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative w-full max-w-[760px]">
          <div className="absolute -inset-5 rounded-[2.2rem] bg-white/40 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 p-3 backdrop-blur-xl sm:p-4 [box-shadow:0_30px_90px_rgba(var(--el-accent-rgb),0.18)]">
            <SampleInvitationTemplate
              imageAreaLabel={t.imageAreaLabel}
              title={event.config.title}
              subtitle={event.config.subtitle}
              date={event.config.date}
            />
          </div>
        </div>

        <motion.a
          href="#reply"
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--el-accent)]/70">{t.scroll}</p>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-5 w-5 text-[color:var(--el-accent)]/60" />
          </motion.div>
        </motion.a>
      </motion.div>
    </section>
  );
}

function TimelineSection({ t }: { t: WeddingTemplateCopy }) {
  return (
    <section className="px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal className="mb-10 text-center sm:mb-14">
          <h2 className="font-display text-4xl text-[color:var(--el-text)] sm:text-5xl">{t.scheduleTitle}</h2>
          <p className="mt-3 text-sm text-[color:var(--el-text)]/55">{t.scheduleDate}</p>
        </ScrollReveal>

        <div className="relative">
          <div className="absolute start-[9px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[color:var(--el-accent)]/25 via-[color:var(--el-accent)]/50 to-transparent" />
          <div className="space-y-4 sm:space-y-6">
            {t.events.map((item) => (
              <TimelineItem key={item.title} event={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ event }: { event: WeddingTemplateCopy["events"][number] }) {
  return (
    <ScrollReveal className="flex gap-4 sm:gap-7">
      <div className="relative mt-[1.25rem] shrink-0 sm:mt-[1.55rem]">
        <div className="h-[19px] w-[19px] rounded-full border-2 border-[color:var(--el-accent)] bg-white [box-shadow:0_0_0_3px_rgba(var(--el-accent-rgb),0.1)]" />
      </div>

      <motion.article
        className="flex-1 rounded-[1.2rem] border border-white/70 bg-white/50 p-4 shadow-[0_20px_60px_rgba(65,42,36,0.11)] backdrop-blur-xl transition sm:rounded-[1.35rem] sm:p-6 hover:-translate-y-1 hover:bg-white/65"
        whileHover={{ scale: 1.01 }}
      >
        <h3 className="font-display text-2xl text-[color:var(--el-accent)] sm:text-3xl">{event.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--el-text)]/55">{event.description}</p>
        <div className="mt-4 grid gap-2 text-sm text-[color:var(--el-text)]/70 sm:mt-5 sm:gap-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0 text-[color:var(--el-accent)]" />
            <span>{event.time}</span>
          </div>
          {event.location ? (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--el-accent)]" />
              <span>{event.location}</span>
            </div>
          ) : null}
        </div>
      </motion.article>
    </ScrollReveal>
  );
}

function LocationSection({ t }: { t: WeddingTemplateCopy }) {
  return (
    <section className="px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal className="text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[color:var(--el-muted)]">{t.venueLabel}</p>
          <h2 className="font-display text-4xl text-[color:var(--el-text)] sm:text-5xl">{t.venueTitle}</h2>
          <p className="mt-5 font-display text-2xl text-[color:var(--el-text)]">{t.venueName}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[color:var(--el-text)]/58">{t.hallInfo}</p>
          <div className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[color:var(--el-accent)] px-6 text-sm font-semibold text-white [box-shadow:0_18px_50px_rgba(var(--el-accent-rgb),0.22)] sm:w-auto">
            <MapPin className="h-4 w-4" />
            {t.directions}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function RsvpSection({ event, t }: { event: EventRecord; t: WeddingTemplateCopy }) {
  return (
    <section id="reply" className="px-5 pb-28 pt-14 sm:px-8 lg:px-12">
      <ScrollReveal className="mx-auto max-w-3xl">
        <RsvpForm event={event} t={t} />
      </ScrollReveal>
    </section>
  );
}

function RsvpForm({ event, t }: { event: EventRecord; t: WeddingTemplateCopy }) {
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
  const normalizedGuestNames = guestNames.map((guest) =>
    `${guest.firstName.trim()} ${guest.lastName.trim()}`.replace(/\s+/g, " ").toLowerCase(),
  );
  const hasDuplicateGuests =
    attending && new Set(normalizedGuestNames.filter(Boolean)).size !== normalizedGuestNames.length;
  const hasGuestNames = !attending
    ? true
    : guestNames.every(
        (guest) =>
          guest.firstName.trim().length > 0 &&
          guest.firstName.trim().length <= MAX_NAME_LENGTH &&
          guest.lastName.trim().length > 0 &&
          guest.lastName.trim().length <= MAX_NAME_LENGTH &&
          guest.gender,
      ) && !hasDuplicateGuests;

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
    setGuestNames((current) =>
      current.map((guest) => (guest.id === id ? { ...guest, [field]: value as GuestName[typeof field] } : guest)),
    );
  }

  async function submitRsvp(formEvent: FormEvent<HTMLFormElement>) {
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
      guest_names: attending
        ? guestNames.map((guest) => `${guest.firstName.trim()} ${guest.lastName.trim()} (${guest.gender === "male" ? "Male" : "Female"})`)
        : [],
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
    <motion.div className="overflow-hidden rounded-[2rem] border border-white/65 bg-white/35 shadow-[0_30px_90px_rgba(65,42,36,0.18)] backdrop-blur-2xl" layout>
      <AnimatePresence mode="wait">
        {isComplete ? (
          <motion.div
            key="thanks"
            className="px-6 py-16 text-center sm:px-12"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45 }}
          >
            <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-full bg-[color:var(--el-accent)] text-white shadow-xl">
              <Check className="h-8 w-8" />
            </div>
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[color:var(--el-muted)]">{t.receivedLabel}</p>
            <h2 className="font-display text-4xl text-[color:var(--el-text)] sm:text-5xl">{t.thanksTitle}</h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[color:var(--el-text)]/65">{t.thanksMessage}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submitRsvp}
            className="px-5 py-8 sm:px-10 sm:py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-8 text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[color:var(--el-muted)]">{t.replyLabel}</p>
              <h2 className="font-display text-4xl text-[color:var(--el-text)] sm:text-5xl">{t.replyTitle}</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[color:var(--el-text)]/58">{t.replySubtitle}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--el-accent)]/70">{t.deadline}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={t.firstName} value={firstName} onChange={setFirstName} autoComplete="given-name" />
              <TextField label={t.lastName} value={lastName} onChange={setLastName} autoComplete="family-name" />
            </div>

            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-medium text-[color:var(--el-text)]/75">{t.attending}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <RadioCard label={t.yes} selected={attendance === "yes"} onClick={() => selectAttendance("yes")} />
                <RadioCard label={t.no} selected={attendance === "no"} onClick={() => selectAttendance("no")} />
              </div>
            </fieldset>

            <AnimatePresence>
              {attending ? (
                <motion.div
                  className="mt-7 space-y-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <SummaryPill label={t.party} value={partySize} />
                    <SummaryPill label={t.male} value={maleGuests} />
                    <SummaryPill label={t.female} value={femaleGuests} />
                  </div>

                  <div>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display text-2xl text-[color:var(--el-text)]">{t.guestsTitle}</h3>
                        <p className="mt-1 text-sm text-[color:var(--el-text)]/55">{t.guestsSubtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={addGuest}
                        disabled={guestNames.length >= MAX_GUESTS}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--el-accent)]/20 bg-white/55 px-4 text-sm font-semibold text-[color:var(--el-accent)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                      >
                        <Plus className="h-4 w-4" />
                        {t.add}
                      </button>
                    </div>

                    <div className="space-y-4">
                      {guestNames.map((guest, index) => (
                        <motion.div
                          key={guest.id}
                          className="grid gap-4 rounded-[1.25rem] border border-white/60 bg-white/35 p-4 sm:grid-cols-[auto_1fr_1fr_auto]"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--el-accent)]/10 text-sm font-semibold text-[color:var(--el-accent)]">
                            {index + 1}
                          </div>
                          <TextField
                            label={t.firstName}
                            value={guest.firstName}
                            onChange={(value) => updateGuest(guest.id, "firstName", value)}
                            autoComplete="given-name"
                          />
                          <TextField
                            label={t.lastName}
                            value={guest.lastName}
                            onChange={(value) => updateGuest(guest.id, "lastName", value)}
                            autoComplete="family-name"
                          />
                          <div className="grid gap-3 sm:col-span-4 sm:grid-cols-[1fr_auto] lg:col-span-1 lg:block">
                            <GenderField
                              value={guest.gender}
                              onChange={(value) => updateGuest(guest.id, "gender", value)}
                              maleLabel={t.male}
                              femaleLabel={t.female}
                              genderLabel={t.gender}
                            />
                            <button
                              type="button"
                              onClick={() => removeGuest(guest.id)}
                              disabled={guestNames.length === 1}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--el-accent)]/15 bg-white/45 px-4 text-sm font-medium text-[color:var(--el-accent)] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-35 sm:self-end lg:mt-7 lg:w-11 lg:px-0"
                              aria-label={`${t.remove} ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="lg:hidden">{t.remove}</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <AnimatePresence>
                      {hasDuplicateGuests ? (
                        <motion.p
                          className="mt-4 rounded-2xl border border-[color:var(--el-accent)]/15 bg-white/55 px-4 py-3 text-sm text-[color:var(--el-accent)]"
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45 }}
                        >
                          {t.duplicateGuest}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {submitError ? (
                <motion.p
                  className="mt-6 rounded-2xl border border-[color:var(--el-accent)]/15 bg-white/55 px-4 py-3 text-sm text-[color:var(--el-accent)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {submitError}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[color:var(--el-accent)] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white [box-shadow:0_18px_50px_rgba(var(--el-accent-rgb),0.28)] transition hover:-translate-y-0.5 hover:bg-[color:var(--el-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
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
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TextField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[color:var(--el-text)]/72">{label}</span>
      <input
        className="premium-field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        autoComplete={autoComplete}
        maxLength={MAX_NAME_LENGTH}
      />
    </label>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.15rem] border border-white/60 bg-white/42 px-5 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--el-text)]/45">{label}</p>
      <p className="mt-1 font-display text-3xl text-[color:var(--el-accent)]">{value}</p>
    </div>
  );
}

function GenderField({
  value,
  onChange,
  maleLabel,
  femaleLabel,
  genderLabel,
}: {
  value: Gender;
  onChange: (value: Gender) => void;
  maleLabel: string;
  femaleLabel: string;
  genderLabel: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-[color:var(--el-text)]/72">{genderLabel}</legend>
      <div className="grid grid-cols-2 gap-2 lg:w-44">
        <GenderButton label={maleLabel} value="male" selected={value === "male"} onClick={onChange} />
        <GenderButton label={femaleLabel} value="female" selected={value === "female"} onClick={onChange} />
      </div>
    </fieldset>
  );
}

function GenderButton({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: Exclude<Gender, "">;
  selected: boolean;
  onClick: (value: Exclude<Gender, "">) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`h-11 rounded-full border px-3 text-sm font-medium transition ${
        selected
          ? "border-[color:var(--el-accent)] bg-[color:var(--el-accent)] text-white [box-shadow:0_10px_28px_rgba(var(--el-accent-rgb),0.2)]"
          : "border-white/65 bg-white/42 text-[color:var(--el-text)]/65 hover:bg-white/70"
      }`}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function RadioCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-[1.15rem] border px-5 py-4 transition ${
        selected
          ? "border-[color:var(--el-accent)]/45 bg-[color:var(--el-accent)]/10 text-[color:var(--el-accent)] [box-shadow:0_14px_35px_rgba(var(--el-accent-rgb),0.12)]"
          : "border-white/65 bg-white/38 text-[color:var(--el-text)]/70 hover:bg-white/62"
      }`}
      aria-pressed={selected}
    >
      <span className="font-medium">{label}</span>
      <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? "border-[color:var(--el-accent)] bg-[color:var(--el-accent)] text-white" : "border-[color:var(--el-text)]/18"}`}>
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
